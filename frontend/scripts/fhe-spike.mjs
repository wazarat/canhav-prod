#!/usr/bin/env node
/**
 * FHE Phase-1 spike: prove the CoFHE encrypt → (register) → decryptForView
 * loop on live Arbitrum Sepolia, and answer the design question empirically:
 * can the creator of an encrypted input decrypt it WITHOUT an on-chain
 * ACL grant (EncryptedIntents.register)?
 *
 *   Part A — encrypt euint64(50_000_000 micro-USD = $50), then decryptForView
 *            immediately (no contract touch). Expected: ACL denial.
 *   Part B — register() on EncryptedIntents (grants FHE.allowSender), then
 *            decryptForView the emitted handle. Expected: 50000000n.
 *
 * Usage:
 *   FHE_SPIKE_PRIVATE_KEY=0x… FHE_INTENTS_ADDRESS=0x… \
 *     node scripts/fhe-spike.mjs
 *
 * FHE_SPIKE_PRIVATE_KEY: throwaway key. Part A needs NO funds (encryption +
 *   permit are off-chain). Part B needs Sepolia ETH for the register() gas
 *   and is skipped unless FHE_INTENTS_ADDRESS is set.
 * ARBITRUM_SEPOLIA_RPC_URL: optional, defaults to the public RPC.
 *
 * This doubles as the headless flag-ON E2E for the crypto loop.
 */

import { createPublicClient, createWalletClient, decodeEventLog, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { arbSepolia } from "@cofhe/sdk/chains";

const RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const INTENTS_ADDRESS = process.env.FHE_INTENTS_ADDRESS ?? "";
const MICRO_USD = 50_000_000n; // $50 at 6 decimals

const INTENTS_ABI = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "sizeUsdMicro",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "handle", type: "uint256" }],
  },
  {
    type: "event",
    name: "IntentRegistered",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "handle", type: "uint256", indexed: false },
    ],
  },
];

function now() {
  return Date.now();
}

async function main() {
  const pk = process.env.FHE_SPIKE_PRIVATE_KEY ?? generatePrivateKey();
  if (!process.env.FHE_SPIKE_PRIVATE_KEY) {
    console.log("No FHE_SPIKE_PRIVATE_KEY — using an ephemeral key (Part A only).");
  }
  const account = privateKeyToAccount(pk);
  console.log(`Spike account: ${account.address}`);
  console.log(`FheTypes.Uint64 numeric = ${FheTypes.Uint64}`);

  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(RPC_URL),
  });

  const cofhe = createCofheClient(
    createCofheConfig({ supportedChains: [arbSepolia] }),
  );
  let t = now();
  await cofhe.connect(publicClient, walletClient);
  console.log(`connect: ${now() - t}ms`);

  // --- Encrypt ---
  t = now();
  const [encrypted] = await cofhe
    .encryptInputs([Encryptable.uint64(MICRO_USD)])
    .onStep((step) => console.log(`  encrypt step: ${JSON.stringify(step)}`))
    .execute();
  console.log(`encrypt: ${now() - t}ms`);
  console.log("encrypted input:", {
    ctHash: encrypted.ctHash.toString(),
    securityZone: encrypted.securityZone,
    utype: encrypted.utype,
    signature: `${encrypted.signature.slice(0, 18)}… (${encrypted.signature.length} chars)`,
  });

  // --- Permit (off-chain EIP-712 self-signature) ---
  t = now();
  await cofhe.permits.getOrCreateSelfPermit();
  console.log(`permit: ${now() - t}ms`);

  // --- Part A: decrypt WITHOUT registration ---
  console.log("\n=== Part A: decryptForView without on-chain registration ===");
  t = now();
  try {
    const value = await cofhe
      .decryptForView(encrypted.ctHash, FheTypes.Uint64)
      .onPoll(({ attemptIndex, elapsedMs }) =>
        console.log(`  poll attempt ${attemptIndex} (${elapsedMs}ms)`),
      )
      .execute();
    console.log(`PART A: DECRYPTED WITHOUT REGISTRATION in ${now() - t}ms → ${value}`);
    console.log(">>> Registration is NOT required for creator decrypt-for-view. <<<");
  } catch (err) {
    console.log(`PART A: denied/failed after ${now() - t}ms (expected — ACL has no grant):`);
    console.log(`  ${err?.name ?? "Error"}: ${err?.message ?? err}`);
  }

  // --- Part B: register then decrypt ---
  if (!INTENTS_ADDRESS) {
    console.log("\nFHE_INTENTS_ADDRESS not set — skipping Part B (register + decrypt).");
    return;
  }
  console.log(`\n=== Part B: register() on ${INTENTS_ADDRESS} then decryptForView ===`);
  t = now();
  const fees = await publicClient.estimateFeesPerGas();
  const txHash = await walletClient.writeContract({
    address: INTENTS_ADDRESS,
    abi: INTENTS_ABI,
    functionName: "register",
    args: [
      {
        ctHash: encrypted.ctHash,
        securityZone: encrypted.securityZone,
        utype: encrypted.utype,
        signature: encrypted.signature,
      },
    ],
    maxFeePerGas: fees.maxFeePerGas * 3n, // headroom vs base-fee races (see execute.ts)
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`register tx ${txHash}: ${receipt.status} in ${now() - t}ms`);

  let handle = null;
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: INTENTS_ABI, data: log.data, topics: log.topics });
      if (ev.eventName === "IntentRegistered") {
        handle = ev.args.handle;
        console.log(
          `IntentRegistered: owner=${ev.args.owner} handle=${handle}` +
            ` (equals input ctHash: ${handle === encrypted.ctHash})`,
        );
      }
    } catch {
      /* other logs */
    }
  }
  if (handle === null) throw new Error("No IntentRegistered event in receipt.");

  t = now();
  const value = await cofhe
    .decryptForView(handle, FheTypes.Uint64)
    .onPoll(({ attemptIndex, elapsedMs }) =>
      console.log(`  poll attempt ${attemptIndex} (${elapsedMs}ms)`),
    )
    .execute();
  console.log(`PART B: decrypted in ${now() - t}ms → ${value}`);
  if (value !== MICRO_USD) throw new Error(`Expected ${MICRO_USD}, got ${value}`);
  console.log("PART B OK — full encrypt → register → decrypt loop verified.");
}

main().catch((err) => {
  console.error("Spike failed:", err);
  process.exit(1);
});
