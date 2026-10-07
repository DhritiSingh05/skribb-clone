import React from 'react';
import { AvatarConfig } from '../../types';

interface AvatarProps {
  config: AvatarConfig;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AVATAR_COLORS = [
  '#4a90e2', // Blue
  '#50e3c2', // Teal
  '#b8e986', // Lime
  '#f8e71c', // Yellow
  '#f5a623', // Orange
  '#ff5b77', // Pink/Red
  '#bd10e0', // Purple
  '#9013fe', // Deep Purple
  '#417505', // Dark Green
  '#8b572a', // Brown
];

export const Avatar: React.FC<AvatarProps> = ({ config, size = 'md', className = '' }) => {
  const sizeMap = {
    xs: 28,
    sm: 38,
    md: 52,
    lg: 76,
    xl: 104,
  };

  const dim = sizeMap[size] || 52;
  const eyesIndex = Math.abs(config.eyes || 0) % 10;
  const mouthIndex = Math.abs(config.mouth || 0) % 10;
  const color = config.color || '#4a90e2';

  // Render eye expressions
  const renderEyes = () => {
    switch (eyesIndex) {
      case 1: // Winking
        return (
          <>
            <circle cx="36" cy="42" r="5" fill="#1e293b" />
            <path d="M 60 42 Q 66 36 72 42" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        );
      case 2: // Happy squint / upside down curves
        return (
          <>
            <path d="M 30 44 Q 38 34 46 44" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 58 44 Q 66 34 74 44" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        );
      case 3: // Glasses / cool specs
        return (
          <>
            <circle cx="36" cy="42" r="9" stroke="#1e293b" strokeWidth="3" fill="#ffffff" />
            <circle cx="68" cy="42" r="9" stroke="#1e293b" strokeWidth="3" fill="#ffffff" />
            <line x1="45" y1="42" x2="59" y2="42" stroke="#1e293b" strokeWidth="3" />
            <circle cx="36" cy="42" r="4" fill="#1e293b" />
            <circle cx="68" cy="42" r="4" fill="#1e293b" />
          </>
        );
      case 4: // Dizzy / X eyes
        return (
          <>
            <path d="M 32 38 L 42 46 M 42 38 L 32 46" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 62 38 L 72 46 M 72 38 L 62 46" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
          </>
        );
      case 5: // Heart eyes
        return (
          <>
            <path d="M 36 44 C 32 37 26 41 31 46 L 36 50 L 41 46 C 46 41 40 37 36 44 Z" fill="#ef4444" />
            <path d="M 68 44 C 64 37 58 41 63 46 L 68 50 L 73 46 C 78 41 72 37 68 44 Z" fill="#ef4444" />
          </>
        );
      case 6: // Angry brows
        return (
          <>
            <path d="M 30 35 L 44 40" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <path d="M 74 35 L 60 40" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="36" cy="44" r="5" fill="#1e293b" />
            <circle cx="68" cy="44" r="5" fill="#1e293b" />
          </>
        );
      case 7: // Sleepy / closed flat
        return (
          <>
            <line x1="30" y1="42" x2="44" y2="42" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            <line x1="60" y1="42" x2="74" y2="42" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
          </>
        );
      case 8: // Big cute anime eyes with highlights
        return (
          <>
            <circle cx="36" cy="42" r="8" fill="#1e293b" />
            <circle cx="34" cy="39" r="3" fill="#ffffff" />
            <circle cx="68" cy="42" r="8" fill="#1e293b" />
            <circle cx="66" cy="39" r="3" fill="#ffffff" />
          </>
        );
      case 9: // Surprised wide eyes
        return (
          <>
            <circle cx="36" cy="42" r="7" stroke="#1e293b" strokeWidth="2.5" fill="#ffffff" />
            <circle cx="36" cy="42" r="3" fill="#1e293b" />
            <circle cx="68" cy="42" r="7" stroke="#1e293b" strokeWidth="2.5" fill="#ffffff" />
            <circle cx="68" cy="42" r="3" fill="#1e293b" />
          </>
        );
      case 0:
      default: // Normal cute round eyes
        return (
          <>
            <circle cx="36" cy="42" r="5.5" fill="#1e293b" />
            <circle cx="34" cy="40" r="1.5" fill="#ffffff" />
            <circle cx="68" cy="42" r="5.5" fill="#1e293b" />
            <circle cx="66" cy="40" r="1.5" fill="#ffffff" />
          </>
        );
    }
  };

  // Render mouth expressions
  const renderMouth = () => {
    switch (mouthIndex) {
      case 1: // Big wide open happy smile
        return (
          <path d="M 38 62 Q 52 82 66 62 Z" fill="#e11d48" stroke="#1e293b" strokeWidth="3" />
        );
      case 2: // Tongue out playfully
        return (
          <>
            <path d="M 38 62 Q 52 74 66 62" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 48 67 C 48 76 56 76 56 67 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="2.5" />
          </>
        );
      case 3: // Grin with teeth
        return (
          <path d="M 36 62 Q 52 78 68 62 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
        );
      case 4: // Flat straight line / neutral
        return (
          <line x1="40" y1="64" x2="64" y2="64" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
        );
      case 5: // Shock / "O" mouth
        return (
          <ellipse cx="52" cy="65" rx="6" ry="8" fill="#1e293b" />
        );
      case 6: // Sad pout
        return (
          <path d="M 40 68 Q 52 58 64 68" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        );
      case 7: // Mustache gentleman
        return (
          <>
            <path d="M 38 61 C 46 58 50 66 52 64 C 54 66 58 58 66 61 C 60 67 44 67 38 61 Z" fill="#1e293b" />
            <path d="M 46 68 Q 52 72 58 68" stroke="#1e293b" strokeWidth="2.5" fill="none" />
          </>
        );
      case 8: // Cat mouth (:3)
        return (
          <path d="M 42 63 Q 47 68 52 64 Q 57 68 62 63" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
        );
      case 9: // Smirk sideways
        return (
          <path d="M 42 65 Q 56 65 65 59" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        );
      case 0:
      default: // Normal sweet smile
        return (
          <path d="M 40 62 Q 52 74 64 62" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center select-none rounded-full overflow-hidden shadow-sm flex-shrink-0 ${className}`}
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 104 104"
        width={dim}
        height={dim}
        className="block transition-transform hover:scale-105"
      >
        {/* Soft shadow */}
        <circle cx="52" cy="54" r="46" fill="rgba(0,0,0,0.15)" />
        {/* Face circle */}
        <circle cx="52" cy="50" r="46" fill={color} stroke="#1e293b" strokeWidth="4.5" />
        {/* Cute blush cheeks */}
        <ellipse cx="28" cy="55" rx="6" ry="3.5" fill="#ffffff" opacity="0.35" />
        <ellipse cx="76" cy="55" rx="6" ry="3.5" fill="#ffffff" opacity="0.35" />
        {/* Eyes & Mouth */}
        {renderEyes()}
        {renderMouth()}
      </svg>
    </div>
  );
};
