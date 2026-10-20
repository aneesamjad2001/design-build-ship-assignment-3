/** The week as a loaded barbell: one plate per planned session, filled as you
 *  train. Decorative — the count is always stated in text beside it. */
export function WeekBar({ done, target }: { done: number; target: number }) {
  const slots = Math.max(done, target);
  const mid = (slots - 1) / 2;
  return (
    <div aria-hidden className="relative flex h-16 items-center justify-center gap-1.5">
      <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded bg-line" />
      <span className="absolute left-0 top-1/2 h-6 w-2 -translate-y-1/2 rounded-sm bg-line" />
      <span className="absolute right-0 top-1/2 h-6 w-2 -translate-y-1/2 rounded-sm bg-line" />
      {Array.from({ length: slots }, (_, i) => {
        const filled = i < done;
        const height = 60 - Math.abs(i - mid) * 7;
        return (
          <span
            key={i}
            style={{ height, animationDelay: `${i * 70}ms` }}
            className={`relative w-4 rounded-sm border-2 ${
              filled ? "plate-in border-ink bg-ink" : "border-muted bg-bg"
            }`}
          />
        );
      })}
    </div>
  );
}
