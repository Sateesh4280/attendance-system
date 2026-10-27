export function ProgressBar({ value = 0, tone = 'brand', thin = false }) {
  const width = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={`progress ${thin ? 'progress-thin' : ''}`}>
      <span className={`progress-fill tone-${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function Avatar({ name = '', src, size = 38, tone = 'brand' }) {
  const label = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <span className={`avatar avatar-${tone}`} style={{ width: size, height: size }}>
      {src ? <img src={src} alt={name} /> : label || '?'}
    </span>
  );
}

export function StatusPill({ tone = 'neutral', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
