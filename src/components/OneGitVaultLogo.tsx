import React from 'react';

export const OneGitVaultLogo: React.FC<{ className?: string }> = ({ className = "w-7 h-7" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded vault tile - Petrol Slate */}
      <rect width="32" height="32" rx="8" fill="#16272f" stroke="#244855" strokeWidth="1.5" />
      
      {/* Vault Arch - Deep Petrol with Vermilion Outline */}
      <path d="M8 12C8 7.58172 11.5817 4 16 4C20.4183 4 24 7.58172 24 12V24C24 26.2091 22.2091 28 20 28H12C9.79086 28 8 26.2091 8 24V12Z" fill="#244855" stroke="#e64833" strokeWidth="1.3" />
      
      {/* Inner Git Branch Stem forming the '1' - Warm Biscuit Cream */}
      <path d="M13 11L16 8V24" stroke="#fbe9d0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Right Git branch - Warm Terracotta */}
      <path d="M16 15C18.5 15 20.5 17 20.5 19.5" stroke="#874f41" strokeWidth="1.8" strokeLinecap="round" />
      
      {/* Branching node points - Cream, Flame Vermilion, Dusty Sage */}
      <circle cx="16" cy="8" r="1.8" fill="#fbe9d0" />
      <circle cx="16" cy="24" r="1.8" fill="#e64833" />
      <circle cx="20.5" cy="19.5" r="1.8" fill="#90aead" />
    </svg>
  );
};
