import React from 'react';

interface SuitcaseLogoProps {
  className?: string;
  size?: number | string;
}

export default function SuitcaseLogo({ className = '', size }: SuitcaseLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Suitcase Main Body */}
      <rect x="22" y="32" width="56" height="46" rx="8" />
      
      {/* Telescopic Handle */}
      <path d="M38 32V18C38 15.8 39.8 14 42 14H58C60.2 14 62 15.8 62 18V32" />
      
      {/* Outer corner guards */}
      <path d="M22 42C27 42 30 39 30 34" strokeWidth="2.5" />
      <path d="M78 42C73 42 70 39 70 34" strokeWidth="2.5" />
      
      {/* Vertical Straps (Minimalistic clean outlines) */}
      <line x1="36" y1="32" x2="36" y2="78" />
      <line x1="64" y1="32" x2="64" y2="78" />
      
      {/* Minimal cute lock in the center */}
      <rect x="46" y="50" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
      
      {/* Wheels */}
      <circle cx="34" cy="83" r="3.5" fill="currentColor" stroke="none" />
      <circle cx="66" cy="83" r="3.5" fill="currentColor" stroke="none" />
      
      {/* Cute minimalist wings on sides */}
      {/* Left Wing */}
      <path d="M16 48C9 46 6 52 11 56C6 58 8 63 15 61" strokeWidth="2.2" />
      {/* Right Wing */}
      <path d="M84 48C91 46 94 52 89 56C94 58 92 63 85 61" strokeWidth="2.2" />
    </svg>
  );
}
