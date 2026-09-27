import React from 'react';

const SpeedGauge = ({ speed }) => {
  const radius = 80;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Speed usually 0-20 km/h. Let's map 0-20 to 0-100%
  const maxSpeed = 20;
  const clampedSpeed = Math.min(Math.max(speed, 0), maxSpeed);
  const percent = (clampedSpeed / maxSpeed) * 100;
  
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  
  let color = 'var(--signal)';
  let glowColor = 'var(--signal-glow)';
  if (speed >= 10) {
    color = 'var(--danger)';
    glowColor = 'rgba(255, 107, 107, 0.3)';
  } else if (speed >= 5) {
    color = 'var(--warning)';
    glowColor = 'rgba(251, 191, 36, 0.3)';
  }

  return (
    <div className="gauge-container" style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}>
      <svg
        height={radius * 2}
        width={radius * 2}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          stroke="rgba(255, 255, 255, 0.04)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ 
            strokeDashoffset, 
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.4s ease' 
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
        />
      </svg>
      <div className="gauge-value flex flex-col items-center">
        <span className="text-3xl font-display font-black" style={{ color, letterSpacing: '-1px' }}>
          {speed.toFixed(1)}
        </span>
        <span className="label" style={{ marginTop: '2px', color: 'var(--mist-500)' }}>
          KM/H
        </span>
      </div>
    </div>
  );
};

export default SpeedGauge;
