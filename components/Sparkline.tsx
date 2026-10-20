/** A small trend line with every point marked. The values it draws are also
 *  written out in text by the caller, so it is never the only source. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 64;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const points = values.map((v, i) => `${x(i)},${max === min ? h / 2 : y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label={label}>
      <line x1={pad} y1={h - 1} x2={w - pad} y2={h - 1} stroke="var(--line)" strokeWidth="1" />
      <polyline points={points} fill="none" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={max === min ? h / 2 : y(v)} r={i === values.length - 1 ? 4.5 : 3} fill={i === values.length - 1 ? "var(--text)" : "var(--bg)"} stroke="var(--text)" strokeWidth="2" />
      ))}
    </svg>
  );
}
