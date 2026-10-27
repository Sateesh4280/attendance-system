import { Link } from 'react-router-dom';

export function BrandMark({ size = 40 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size * 0.62} height={size * 0.62} fill="none">
        <path d="M32 16 9 26l23 10 23-10-23-10Z" fill="currentColor" />
        <path
          d="M18 31v9c0 4 6.3 7 14 7s14-3 14-7v-9l-14 6-14-6Z"
          fill="currentColor"
          opacity=".75"
        />
        <path d="M53 28v12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function Brand({ compact = false, to = '/' }) {
  return (
    <Link to={to} className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="Attendly home">
      <BrandMark size={compact ? 34 : 40} />
      {!compact && (
        <span className="brand-text">
          <strong>Attendly</strong>
          <small>Attendance suite</small>
        </span>
      )}
    </Link>
  );
}
