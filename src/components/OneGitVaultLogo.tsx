import React from 'react';

export const OneGitVaultLogo: React.FC<{ className?: string }> = ({ className = "w-7 h-7" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded vault tile */}
      <rect width="32" height="32" rx="8" fill="#14151c" stroke="#282a38" strokeWidth="1.5" />
      
      {/* Vault Arch */}
      <path d="M8 12C8 7.58172 11.5817 4 16 4C20.4183 4 24 7.58172 24 12V24C24 26.2091 22.2091 28 20 28H12C9.79086 28 8 26.2091 8 24V12Z" fill="#1b1d28" stroke="#f59e0b" strokeWidth="1.25" />
      
      {/* Inner Git Branch Stem forming the '1' */}
      <path d="M13 11L16 8V24" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Right Git branch */}
      <path d="M16 15C18.5 15 20.5 17 20.5 19.5" stroke="#d97706" strokeWidth="1.75" strokeLinecap="round" />
      
      {/* Branching node points */}
      <circle cx="16" cy="8" r="1.8" fill="#fde68a" />
      <circle cx="16" cy="24" r="1.8" fill="#f59e0b" />
      <circle cx="20.5" cy="19.5" r="1.8" fill="#fbbf24" />
    </svg>
  );
};
