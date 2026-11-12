import React from 'react';

const MetricCard = ({ label, value, unit, trend, valueColor }) => {
  const formattedValue = typeof value === 'number'
    ? (Number.isInteger(value) ? value : parseFloat(value.toFixed(1)))
    : (value ?? '-');

  return (
    <div className="card flex flex-col items-center justify-center text-center gap-2" style={{ padding: '1.25rem 1rem' }}>
      <div className="label">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-display font-bold" style={{ letterSpacing: '-0.5px', color: valueColor || 'var(--mist-100)' }}>{formattedValue}</span>
        {unit && <span className="label" style={{ color: 'var(--mist-500)' }}>{unit}</span>}
      </div>
      {trend && (
        <div className={`text-sm font-semibold font-mono ${trend === 'up' ? 'text-danger' : 'text-success'}`}>
          {trend === 'up' ? '↑' : '↓'}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
