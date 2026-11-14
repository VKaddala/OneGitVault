import React from 'react';

export const NexusLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#18181f" stroke="#2e2e38" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4" fill="#f59e0b" />
      <path d="M16 6V12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 20V26" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 16H12" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 16H26" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="6" r="1.5" fill="#fde68a" />
      <circle cx="26" cy="16" r="1.5" fill="#fde68a" />
      <circle cx="16" cy="26" r="1.5" fill="#b45309" />
      <circle cx="6" cy="16" r="1.5" fill="#b45309" />
    </svg>
  );
};
