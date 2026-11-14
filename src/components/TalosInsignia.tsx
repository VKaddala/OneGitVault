import React from 'react';

export const TalosInsignia: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Vault Shield */}
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#18181f" stroke="#2e2e38" strokeWidth="1.5" />
      {/* Inner Chamber */}
      <path d="M8 12L16 6L24 12V24C24 25.1046 23.1046 26 22 26H10C8.89543 26 8 25.1046 8 24V12Z" fill="#22222c" stroke="#f59e0b" strokeWidth="1.25" strokeLinejoin="round" />
      {/* Central Talos Core */}
      <circle cx="16" cy="17" r="3.5" fill="#f59e0b" />
      <circle cx="16" cy="17" r="1.5" fill="#fde68a" />
      <path d="M16 10V12" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 22V24" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 17H12.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19.5 17H21" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};
