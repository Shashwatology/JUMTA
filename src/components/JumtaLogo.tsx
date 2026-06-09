import React from 'react';

interface JumtaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
}

export const JumtaLogo: React.FC<JumtaLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'color'
}) => {
  // Dimensions matching sizes
  const dims = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 96, height: 96 }
  }[size];

  // Colors based on variant
  const colors = {
    color: {
      primary: '#D65A6F', // Jaipur Heritage Pink
      secondary: '#185FA5', // JMRC Metro Blue
      accent: '#0FA971', // Transit Green
      neutral: '#111827'
    },
    light: {
      primary: '#FFFFFF',
      secondary: '#FFFFFF',
      accent: '#FFFFFF',
      neutral: '#FFFFFF'
    },
    dark: {
      primary: '#111827',
      secondary: '#1F2937',
      accent: '#374151',
      neutral: '#111827'
    }
  }[variant];

  return (
    <svg
      width={dims.width}
      height={dims.height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background shape mimicking Rajput Symmetry / Jharokha Arch contour */}
      <path
        d="M50 5 C75 5 85 20 85 45 C85 75 75 95 50 95 C25 95 15 75 15 45 C15 20 25 5 50 5 Z"
        fill={variant === 'light' ? 'rgba(255,255,255,0.08)' : 'rgba(214, 90, 111, 0.05)'}
        stroke={colors.primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Symmetric Jharokha grid structures representing Jaipur city grid planning */}
      <path
        d="M35 30 H65 M30 45 H70 M35 60 H65"
        stroke={colors.secondary}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Transit loops (vertical and horizontal rails) forming the JUMTA 'J' */}
      <path
        d="M42 20 V68 C42 75, 48 80, 56 80 H62"
        stroke={colors.primary}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Intersecting secondary line representing bus transit, weaving through the Metro line */}
      <path
        d="M28 52 H64 C70 52, 74 58, 74 64 V72"
        stroke={colors.accent}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center connection node showing unified ticketing (One Ticket Hub) */}
      <circle
        cx="50"
        cy="52"
        r="6.5"
        fill={colors.primary}
        stroke={variant === 'light' ? '#111827' : '#FFFFFF'}
        strokeWidth="2"
      />

      {/* Outer framing arch contours */}
      <path
        d="M24 15 C24 15, 34 5, 50 12 C66 5, 76 15, 76 15"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
