import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 22 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Mission Control Logo"
    >
      {/* Dark Utilitarian Squircle Canvas */}
      <rect x="8" y="8" width="240" height="240" rx="52" fill="#0c0c0e" stroke="#27272a" strokeWidth="6" />

      {/* Subtle Radar Range Rings */}
      <circle cx="128" cy="128" r="88" stroke="#27272a" strokeWidth="3" strokeDasharray="6 8" />
      <circle cx="128" cy="128" r="54" stroke="#3f3f46" strokeWidth="2.5" />

      {/* Precision Crosshair Ticks */}
      <line x1="128" y1="20" x2="128" y2="36" stroke="#71717a" strokeWidth="4" strokeLinecap="round" />
      <line x1="128" y1="220" x2="128" y2="236" stroke="#71717a" strokeWidth="4" strokeLinecap="round" />
      <line x1="20" y1="128" x2="36" y2="128" stroke="#71717a" strokeWidth="4" strokeLinecap="round" />
      <line x1="220" y1="128" x2="236" y2="128" stroke="#71717a" strokeWidth="4" strokeLinecap="round" />

      {/* Ascent Delta Chevron */}
      <path
        d="M 128 62 L 184 180 L 128 154 L 72 180 Z"
        fill="#f4f4f5"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Core Emerald Beacon */}
      <circle cx="128" cy="122" r="16" stroke="#10b981" strokeWidth="3" strokeOpacity="0.7" />
      <circle cx="128" cy="122" r="9" fill="#10b981" />
    </svg>
  );
};
