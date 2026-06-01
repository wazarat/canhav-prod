export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-electric-500/10 blur-[140px]" />
      <div className="absolute right-[-10%] top-24 h-[420px] w-[420px] rounded-full bg-neon-500/10 blur-[130px]" />
      <div className="absolute bottom-[-10%] left-[-5%] h-[420px] w-[420px] rounded-full bg-signal-500/10 blur-[130px]" />
    </div>
  );
}
