export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Belt-and-suspenders: a stray fire-and-forget rejection (outside any
    // request try/catch) would otherwise crash the Node process. Log only —
    // never exit — so the cron and page renders keep serving.
    process.on("unhandledRejection", (reason) => {
      console.error("[cron] unhandledRejection:", reason);
    });
  }
}
