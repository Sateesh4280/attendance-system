import { useState } from 'react';
import { classLabel, formatDate } from '../utils/format.js';

/**
 * Lightweight dependency-free bar chart for weekly attendance.
 */
export default function TrendChart({ data = [] }) {
  const [active, setActive] = useState(null);
  const hasData = data.some((item) => item.total > 0);

  return (
    <div className="trend-chart">
      <div className="trend-bars">
        {data.map((item, index) => {
          const isEmpty = !item.total;
          const height = isEmpty ? 3 : Math.max(item.percentage, 4);
          return (
            <button
              key={item.date}
              type="button"
              className={`trend-col ${active === index ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${formatDate(item.date)}: ${item.percentage}% attendance`}
            >
              <span className="trend-value">{item.total ? `${Math.round(item.percentage)}%` : '—'}</span>
              <span className="trend-track">
                <span
                  className={`trend-bar ${isEmpty ? 'trend-bar-empty' : item.percentage < 75 ? 'trend-bar-low' : ''}`}
                  style={{ height: `${height}%` }}
                />
              </span>
              <span className="trend-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      {!hasData && <p className="chart-empty">No attendance marked in the last 7 days.</p>}
      <p className="chart-caption">
        {hasData
          ? 'Daily attendance rate across all classes. Bars below 75% are highlighted.'
          : 'Mark a session to start seeing trends here.'}
      </p>
    </div>
  );
}

export function SessionRow({ session }) {
  const counts = session.counts || {};
  return (
    <div className="session-row">
      <div className="session-date">
        <strong>{new Date(session.date).getUTCDate()}</strong>
        <span>{formatDate(session.date, { month: 'short' })}</span>
      </div>
      <div className="session-info">
        <strong>{session.subject?.name || 'Subject'}</strong>
        <span>{classLabel(session.class)}</span>
      </div>
      <div className="session-counts">
        <span className="dot dot-success" /> {counts.attended ?? 0}/{counts.total ?? 0}
      </div>
    </div>
  );
}
