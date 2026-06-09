import React from 'react';

interface JharokhaDividerProps {
  className?: string;
  color?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export const JharokhaDivider: React.FC<JharokhaDividerProps> = ({
  className = '',
  color = '#D65A6F', // Jaipur Heritage Pink
  intensity = 'medium'
}) => {
  const opacity = {
    low: '0.1',
    medium: '0.25',
    high: '0.5'
  }[intensity];

  return (
    <div className={`w-full flex items-center justify-center py-2 select-none ${className}`}>
      {/* Left wing line */}
      <div className="flex-grow h-px bg-gradient-to-r from-transparent to-slate-200" />
      
      {/* Center Jharokha architectural pattern */}
      <div className="flex items-center gap-1 mx-4" style={{ color, opacity }}>
        {/* Left symmetry arch */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 12 C14 12, 10 10, 8 6 C6 2, 2 0, 0 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 6 C15 6, 12 5, 10 3 C8 1, 4 0, 0 0" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
        </svg>
        
        {/* Central Lotus / Crest motif */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform rotate-45">
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M12 2 V6 M12 18 V22 M2 12 H6 M18 12 H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Right symmetry arch */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform scale-x-[-1]">
          <path d="M18 12 C14 12, 10 10, 8 6 C6 2, 2 0, 0 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 6 C15 6, 12 5, 10 3 C8 1, 4 0, 0 0" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
        </svg>
      </div>

      {/* Right wing line */}
      <div className="flex-grow h-px bg-gradient-to-l from-transparent to-slate-200" />
    </div>
  );
};
