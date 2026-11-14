import React from 'react';

export const OneGitLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer tactile rounded tile */}
      <rect width="32" height="32" rx="8" fill="#15161d" stroke="#2a2c3a" strokeWidth="1.5" />
      
      {/* Branching tree stem (forming the '1') */}
      <path d="M12 10L16 6V26" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Git node branches */}
      <path d="M16 14C19.5 14 22 16.5 22 20" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      
      {/* Branching commit points */}
      <circle cx="16" cy="6" r="2.2" fill="#fde68a" />
      <circle cx="16" cy="26" r="2.2" fill="#d97706" />
      <circle cx="22" cy="20" r="2.2" fill="#fbbf24" />
    </svg>
  );
};
