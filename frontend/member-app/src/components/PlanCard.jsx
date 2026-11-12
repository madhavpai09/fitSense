import React from 'react';

const PlanCard = ({ title, value, unit, avgValue }) => {
  const isAbove = value > avgValue;
  const diff = avgValue !== undefined && avgValue !== null ? (value - avgValue).toFixed(1) : null;
  const formattedValue = typeof value === 'number'
    ? (Number.isInteger(value) ? value : parseFloat(value.toFixed(1)))
    : (value ?? '-');
  
  return (
    <div className="card plan-card flex flex-col gap-3" style={{ padding: '1.5rem' }}>
      <div className="label">
        {title}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-display font-black text-signal" style={{ letterSpacing: '-1px' }}>{formattedValue}</span>
        <span className="text-mist text-sm font-mono">{unit}</span>
      </div>
      {avgValue !== undefined && (
        <div className="flex items-center gap-2 text-sm font-mono">
          <span style={{ 
            color: isAbove ? 'var(--warning)' : 'var(--success)',
            fontWeight: 600
          }}>
            {isAbove ? '▲' : '▼'} {isAbove ? '+' : ''}{diff}
          </span>
          <span className="text-muted text-xs">vs avg</span>
        </div>
      )}
    </div>
  );
};

export default PlanCard;
