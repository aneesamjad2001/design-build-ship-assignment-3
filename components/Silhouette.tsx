import type { Look } from "@/lib/looks";

/** A simple front-view figure whose proportions follow the look. It only suggests
 *  the overall shape — wide or narrow shoulders, waist, hips, legs — it isn't a promise. */
export function Silhouette({ shape, className = "" }: { shape: Look["shape"]; className?: string }) {
  const cx = 50;
  const sh = 13 + 12 * (shape.shoulder - 1) + 2;
  const wh = 10 * shape.waist;
  const hh = 10 + 14 * (shape.hip - 1);
  const arm = shape.arm;
  const thigh = shape.thigh;
  const armX = sh + 3;
  const legX = hh * 0.6 + 1.5;
  return (
    <svg viewBox="0 0 100 200" className={className} aria-hidden fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx={cx} cy={17} r={9.5} stroke="none" />
      <rect x={cx - 4} y={25} width={8} height={11} rx={3} stroke="none" />
      {/* torso: shoulders → waist → hips */}
      <polygon points={`${cx - sh},40 ${cx + sh},40 ${cx + wh},90 ${cx + hh},116 ${cx - hh},116 ${cx - wh},90`} strokeWidth={5} />
      {/* arms: upper arm thicker than forearm */}
      {[-1, 1].map((s) => (
        <g key={`a${s}`}>
          <line x1={cx + s * (armX - 3)} y1={44} x2={cx + s * (armX + 1)} y2={78} strokeWidth={8.5 * arm} />
          <line x1={cx + s * (armX + 1)} y1={78} x2={cx + s * (armX + 4)} y2={108} strokeWidth={6 * arm} />
        </g>
      ))}
      {/* legs: thigh tapering to calf */}
      {[-1, 1].map((s) => (
        <g key={`l${s}`}>
          <line x1={cx + s * legX} y1={120} x2={cx + s * (legX + 1)} y2={160} strokeWidth={11 * thigh} />
          <line x1={cx + s * (legX + 1)} y1={160} x2={cx + s * (legX + 1.5)} y2={190} strokeWidth={7.5 * Math.sqrt(thigh)} />
        </g>
      ))}
    </svg>
  );
}
