import Icon from './Icon.jsx';

export default function StatCard({ label, value, hint, icon = 'chart', tone = 'brand' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

export function MiniStat({ label, value, tone = 'brand' }) {
  return (
    <div className={`mini-stat mini-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
