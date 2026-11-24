import React from 'react';

export interface OneGitVaultLogoProps {
  size?: number;
  className?: string;
  outlineOnly?: boolean;
  color?: string;
}

export const OneGitVaultLogo: React.FC<OneGitVaultLogoProps> = ({
  size = 22,
  className,
  outlineOnly = false,
  color = '#38bdf8'
}) => {
  if (outlineOnly) {
    return (
      <svg 
        width={size}
        height={size}
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: 'block', flexShrink: 0 }}
      >
        {/* Top Hexagon Outline */}
        <polygon points="50,14 68,24 68,46 50,56 32,46 32,24" fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
        <polygon points="50,28 52,33 57,34 53,37 54,42 50,39 46,42 47,37 43,34 48,33" fill={color} />

        {/* Bottom Left Hexagon Outline */}
        <polygon points="30,48 48,58 48,80 30,90 12,80 12,58" fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
        <text x="30" y="73" fontFamily="Consolas, monospace" fontSize="13" fontWeight="900" fill={color} textAnchor="middle">&lt;/&gt;</text>

        {/* Bottom Right Hexagon Outline */}
        <polygon points="70,48 88,58 88,80 70,90 52,80 52,58" fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
        <circle cx="70" cy="63" r="3.2" fill={color} />
        <circle cx="63" cy="76" r="2.6" fill={color} />
        <circle cx="77" cy="76" r="2.6" fill={color} />
        <path d="M 70 65 L 70 69 M 70 69 L 63 74 M 70 69 L 77 74" stroke={color} strokeWidth="2.2" strokeLinecap="round" />

        {/* Central Intersection Starlight Node */}
        <circle cx="50" cy="56" r="4.5" fill={color} />
      </svg>
    );
  }

  return (
    <svg 
      width={size}
      height={size}
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="ogv-android-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="ogv-android-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Outer Squircle Container */}
      <rect x="3" y="3" width="94" height="94" rx="24" fill="url(#ogv-android-bg)" stroke="url(#ogv-android-border)" strokeWidth="3" />

      {/* Top Hexagon (GitHub Star Module) */}
      <polygon points="50,14 68,24 68,46 50,56 32,46 32,24" fill="#090d16" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points="50,28 52,33 57,34 53,37 54,42 50,39 46,42 47,37 43,34 48,33" fill="#fbbf24" />

      {/* Bottom Left Hexagon (Code Syntax Module) */}
      <polygon points="30,48 48,58 48,80 30,90 12,80 12,58" fill="#090d16" stroke="#38bdf8" strokeWidth="2.5" strokeLinejoin="round" />
      <text x="30" y="73" fontFamily="Consolas, monospace" fontSize="13" fontWeight="900" fill="#38bdf8" textAnchor="middle">&lt;/&gt;</text>

      {/* Bottom Right Hexagon (Git Branch DAG Module) */}
      <polygon points="70,48 88,58 88,80 70,90 52,80 52,58" fill="#090d16" stroke="#a855f7" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="70" cy="63" r="3.2" fill="#a855f7" />
      <circle cx="63" cy="76" r="2.6" fill="#c084fc" />
      <circle cx="77" cy="76" r="2.6" fill="#c084fc" />
      <path d="M 70 65 L 70 69 M 70 69 L 63 74 M 70 69 L 77 74" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" />

      {/* Central Intersection Starlight Node */}
      <circle cx="50" cy="56" r="4.5" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.5" />
    </svg>
  );
};
