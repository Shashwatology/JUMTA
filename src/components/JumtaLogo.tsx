import React from 'react';

interface JumtaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
}

export const JumtaLogo: React.FC<JumtaLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  // Dimensions matching sizes
  const dims = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 96, height: 96 }
  }[size];

  return (
    <img
      src="/jumta_logo.png"
      alt="JUMTA Logo"
      width={dims.width}
      height={dims.height}
      className={`${className} object-contain`}
      style={{ width: dims.width, height: dims.height }}
    />
  );
};
