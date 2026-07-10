#!/usr/bin/env node
/**
 * FHE spike: prove the CoFHE loops on live Arbitrum Sepolia.
 *
 *   Part A — encrypt euint64(50_000_000 micro-USD = $50), then decryptForView
 *            immediately (no contract touch). Expected: ACL denial.
 *            (Phase 1, PROVEN 2026-07-10: permit_denied.)
 *   Part B — register() on EncryptedIntents (grants FHE.allowSender), then
 *            decryptForView the emitted handle. Expected: 50000000n.
 *   Part C — Phase 2 caps: setCaps($15/$25) → registerAndCheck sizes →
 *            attested decryptForTx of the ebool (verified against
 *            TaskManager.decryptResultSigner, exactly like the server) →
 *            recordSpend accrual → cumulative-cap flip to "over".
 *
 * Usage:
 *   FHE_SPIKE_PRIVATE_KEY=0x… FHE_INTENTS_ADDRESS=0x… \
 *     node scripts/fhe-spike.mjs
 *
 * FHE_SPIKE_PRIVATE_KEY: throwaway key. Part A needs NO funds (encryption +
 *   permit are off-chain). Parts B/C need Sepolia ETH for gas and are
 *   skipped unless FHE_INTENTS_ADDRESS is set.
 * ARBITRUM_SEPOLIA_RPC_URL: optional, defaults to the public RPC.
 *
 * This doubles as the headless flag-ON E2E for the crypto loop.
 */

import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodePacked,
  http,
  keccak256,
  parseAbi,
  recoverAddress,
  stringToBytes,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { arbSepolia } from "@cofhe/sdk/chains";

const RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const INTENTS_ADDRESS = process.env.FHE_INTENTS_ADDRESS ?? "";
const MICRO_USD = 50_000_000n; // $50 at 6 decimals

const IN_EUINT64 = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" },
];

const INTENTS_ABI = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "sizeUsdMicro", type: "tuple", components: IN_EUINT64 }],
    outputs: [{ name: "handle", type: "uint256" }],
  },
  {
    type: "function",
    name: "setCaps",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentKey", type: "bytes32" },
      { name: "perTradeCapMicro", type: "tuple", components: IN_EUINT64 },
      { name: "cumulativeCapMicro", type: "tuple", components: IN_EUINT64 },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "registerAndCheck",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentKey", type: "bytes32" },
      { name: "sizeUsdMicro", type: "tuple", components: IN_EUINT64 },
    ],
    outputs: [
      { name: "sizeHandle", type: "uint256" },
      { name: "okHandle", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "recordSpend",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentKey", type: "bytes32" },
      { name: "sizeHandle", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "IntentRegistered",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "handle", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CapChecked",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "agentKey", type: "bytes32", indexed: true },
      { name: "sizeHandle", type: "uint256", indexed: false },
      { name: "okHandle", type: "uint256", indexed: false },
    ],
  },
];

const TASK_MANAGER = "0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9";

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

  // --- Part C: Phase 2 encrypted caps ---
  console.log("\n=== Part C: setCaps → registerAndCheck → attested ebool → recordSpend ===");
  const agentKey = keccak256(stringToBytes("fhe-spike-agent"));
  const attestor = await publicClient.readContract({
    address: TASK_MANAGER,
    abi: parseAbi(["function decryptResultSigner() view returns (address)"]),
    functionName: "decryptResultSigner",
  });
  console.log(`decryptResultSigner: ${attestor}`);
  if (/^0x0+$/.test(attestor)) {
    throw new Error("Zero attestation signer — the server-side verification would fail closed.");
  }

  async function sendTx(functionName, args) {
    const txFees = await publicClient.estimateFeesPerGas();
    const hash = await walletClient.writeContract({
      address: INTENTS_ADDRESS,
      abi: INTENTS_ABI,
      functionName,
      args,
      maxFeePerGas: txFees.maxFeePerGas * 3n,
      maxPriorityFeePerGas: txFees.maxPriorityFeePerGas,
    });
    const rcpt = await publicClient.waitForTransactionReceipt({ hash });
    if (rcpt.status !== "success") throw new Error(`${functionName} reverted (${hash})`);
    return rcpt;
  }

  function toIn(enc) {
    return {
      ctHash: enc.ctHash,
      securityZone: enc.securityZone,
      utype: enc.utype,
      signature: enc.signature,
    };
  }

  // Caps: $15 per trade, $25 per 24h (micro-USD).
  t = now();
  const [perTrade, cumulative] = await cofhe
    .encryptInputs([Encryptable.uint64(15_000_000n), Encryptable.uint64(25_000_000n)])
    .execute();
  await sendTx("setCaps", [agentKey, toIn(perTrade), toIn(cumulative)]);
  console.log(`setCaps($15/$25): ${now() - t}ms`);

  // registerAndCheck a size, then decrypt the ebool in ATTESTED form and
  // verify the signature exactly like lib/server/fheCapCheck.ts does.
  async function checkSize(microSize) {
    const [enc] = await cofhe.encryptInputs([Encryptable.uint64(microSize)]).execute();
    const rcpt = await sendTx("registerAndCheck", [agentKey, toIn(enc)]);
    let sizeHandle = null;
    let okHandle = null;
    for (const log of rcpt.logs) {
      try {
        const ev = decodeEventLog({ abi: INTENTS_ABI, data: log.data, topics: log.topics });
        if (ev.eventName === "CapChecked") {
          sizeHandle = ev.args.sizeHandle;
          okHandle = ev.args.okHandle;
        }
      } catch {
        /* other logs */
      }
    }
    if (okHandle === null) throw new Error("No CapChecked event.");

    const result = await cofhe.decryptForTx(okHandle).withPermit().execute();
    const within = BigInt(result.decryptedValue) !== 0n;

    // Server-equivalent attestation check (fheCapCheck.ts).
    const utype = Number((okHandle >> 8n) & 0x7fn);
    const resultHash = keccak256(
      encodePacked(
        ["uint256", "uint32", "uint64", "uint256"],
        [within ? 1n : 0n, utype, BigInt(arbitrumSepolia.id), okHandle],
      ),
    );
    const recovered = await recoverAddress({ hash: resultHash, signature: result.signature });
    const attested = recovered.toLowerCase() === attestor.toLowerCase();
    console.log(
      `  check $${Number(microSize) / 1e6}: within=${within} attested=${attested}` +
        ` (recovered ${recovered})`,
    );
    if (!attested) throw new Error("Attestation signature did not recover to decryptResultSigner.");
    return { within, sizeHandle };
  }

  const c1 = await checkSize(10_000_000n); // $10 vs $15/$25, spent $0 → within
  if (!c1.within) throw new Error("Expected $10 within caps (spent $0).");
  await sendTx("recordSpend", [agentKey, c1.sizeHandle]);

  const c2 = await checkSize(20_000_000n); // $20 > $15 per-trade → over
  if (c2.within) throw new Error("Expected $20 over the per-trade cap.");

  const c3 = await checkSize(10_000_000n); // $10, spent $10, 20 ≤ 25 → within
  if (!c3.within) throw new Error("Expected second $10 within caps (spent $10).");
  await sendTx("recordSpend", [agentKey, c3.sizeHandle]);

  const c4 = await checkSize(10_000_000n); // $10, spent $20, 30 > 25 → over
  if (c4.within) throw new Error("Expected third $10 over the cumulative cap (spent $20).");

  console.log(
    "PART C OK — encrypted per-trade + cumulative caps, spend accrual, and " +
      "server-verifiable attestations all proven on ciphertext.",
  );
}

main().catch((err) => {
  console.error("Spike failed:", err);
  process.exit(1);
});
