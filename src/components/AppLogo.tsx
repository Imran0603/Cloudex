import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 36, className = '', withGlow = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Aether Cloud Logo"
    >
      <defs>
        {/* Soft atmospheric blue ambient behind the fluid glass shape */}
        {withGlow && (
          <filter id="aetherAmbientGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}

        {/* Liquid Glass Metallic Silver-to-Deep-Blue Gradient */}
        <linearGradient id="liquidSilverBlue" x1="18" y1="16" x2="82" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#E2E8F0" stopOpacity="0.85" />
          <stop offset="42%" stopColor="#94A3B8" stopOpacity="0.5" />
          <stop offset="68%" stopColor="#3B82F6" stopOpacity="0.75" />
          <stop offset="88%" stopColor="#1D4ED8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
        </linearGradient>

        {/* Specular Rim Arc Highlight */}
        <linearGradient id="specularRim" x1="25" y1="20" x2="75" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#60A5FA" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>

        {/* Secondary Fluid Swirl Gradient */}
        <linearGradient id="fluidSwirl" x1="50" y1="30" x2="50" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.2" />
        </linearGradient>

        {/* Core Electric Blue Glow Filter */}
        <filter id="nucleusGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Radial Depth Gradient */}
        <radialGradient id="depthGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#0B0F19" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.98" />
        </radialGradient>
      </defs>

      {/* 1. Subtle Dark Transparent Vignette Base */}
      <circle cx="50" cy="50" r="46" fill="url(#depthGradient)" />

      {/* 2. Soft Blue Fluid Ambient Shadow */}
      <ellipse
        cx="50"
        cy="76"
        rx="28"
        ry="8"
        fill="#2563EB"
        fillOpacity="0.28"
        filter="blur(8px)"
      />

      {/* 3. Outer Symbolic Abstract Fluid Shape (Organic Liquid Glass Metamorphosis) */}
      <path
        d="M 50 18
           C 66 18 82 28 82 46
           C 82 64 68 78 50 78
           C 34 78 20 68 18 52
           C 16 38 28 26 40 22
           C 44 20 47 18 50 18 Z"
        fill="url(#liquidSilverBlue)"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth="0.75"
      />

      {/* 4. Secondary Fluid Droplet / Dynamic Flow Layer */}
      <path
        d="M 50 25
           C 61 25 73 34 73 47
           C 73 60 62 70 50 70
           C 38 70 27 60 28 48
           C 29 37 38 29 46 26
           C 47.5 25.5 48.8 25 50 25 Z"
        fill="url(#fluidSwirl)"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* 5. Inner Fluid Cavity with Core Keyhole / Floating Orb */}
      <circle
        cx="50"
        cy="47"
        r="11"
        fill="#090D16"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="0.8"
      />

      {/* 6. Electric Blue Glowing Keyhole Core Symbol (Aether Vault + Cloud) */}
      <g filter="url(#nucleusGlow)">
        {/* Core circle */}
        <circle cx="50" cy="45" r="4.2" fill="#60A5FA" />
        {/* Keyhole stem / teardrop anchor */}
        <path
          d="M 47.8 46.5
             L 46.8 53.5
             C 46.8 55.2 48.2 56.5 50 56.5
             C 51.8 56.5 53.2 55.2 53.2 53.5
             L 52.2 46.5
             Z"
          fill="#3B82F6"
        />
        {/* Intense white center spark */}
        <circle cx="50" cy="45" r="1.6" fill="#FFFFFF" />
      </g>

      {/* 7. Liquid Glass Specular Rim Highlights (Top & Shoulder curves) */}
      <path
        d="M 28 35
           C 34 24 45 19 55 19
           C 68 19 78 27 80 39"
        stroke="url(#specularRim)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Subtle lower refraction curve */}
      <path
        d="M 32 68
           C 38 74 46 76 54 76
           C 64 76 72 71 76 63"
        stroke="rgba(255, 255, 255, 0.28)"
        strokeWidth="1.0"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};
