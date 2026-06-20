import React from "react";

/**
 * TradeIntel hexagon-globe logo.
 * Variants:
 *   - "full"  : hexagon badge + "TRADE INTEL" wordmark + tagline
 *   - "icon"  : just the hexagon badge (for sidebar)
 *   - "wordmark-light" : same as full but for light backgrounds
 *
 * The `live` prop adds a pulsing gold glow + a small "LIVE" status dot.
 */
export default function Logo({ variant = "icon", live = true, height = 40, className = "" }) {
  if (variant === "full" || variant === "full-light") {
    const isLight = variant === "full-light";
    const titleColor = isLight ? "#0B1426" : "#F8FAFC";
    const accentColor = isLight ? "#1557D4" : "#60A5FA";
    const taglineColor = isLight ? "#8FA3B8" : "rgba(255,255,255,0.5)";
    const gradFrom = isLight ? "#1557D4" : "#3B82F6";
    const gradTo = isLight ? "#071020" : "#1D4ED8";
    const gid = `g-${variant}`;
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        {live && <span className="logo-glow" aria-hidden />}
        <svg height={height} viewBox="0 0 316 92" xmlns="http://www.w3.org/2000/svg" className="relative">
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradFrom} />
              <stop offset="100%" stopColor={gradTo} />
            </linearGradient>
          </defs>
          <polygon points="44,3 82,25 82,69 44,91 6,69 6,25" fill={`url(#${gid})`} />
          <circle cx="44" cy="47" r="20" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
          <ellipse cx="44" cy="47" rx="9.5" ry="20" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1" />
          <line x1="24" y1="47" x2="64" y2="47" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
          <line x1="27" y1="35" x2="61" y2="35" stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" />
          <line x1="27" y1="59" x2="61" y2="59" stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" />
          <line x1="44" y1="27" x2="44" y2="67" stroke="#FBBF24" strokeWidth="1.2" opacity="0.85" strokeLinecap="round" />
          <line x1="24" y1="47" x2="64" y2="47" stroke="#FBBF24" strokeWidth="1.2" opacity="0.85" strokeLinecap="round" />
          <line x1="44" y1="27" x2="44" y2="33" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
          <line x1="44" y1="67" x2="44" y2="61" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
          <line x1="24" y1="47" x2="30" y2="47" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
          <line x1="64" y1="47" x2="58" y2="47" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
          <rect x="41.5" y="44.5" width="5" height="5" fill="#FBBF24" transform="rotate(45 44 47)" rx="0.4" />
          <text x="98" y="51" fontFamily="'Oswald', 'Arial Black', sans-serif" fontSize="36" fontWeight="700" fill={titleColor} letterSpacing="-0.5">
            TRADE<tspan fill={accentColor}>INTEL</tspan>
          </text>
          <text x="99" y="68" fontFamily="'JetBrains Mono', monospace" fontSize="8.5" fill={taglineColor} letterSpacing="2.6">PAKISTAN EXPORT INTELLIGENCE</text>
          <rect x="99" y="73" width="188" height="1.8" fill="#FBBF24" rx="1" />
        </svg>
      </div>
    );
  }

  // Icon-only (hexagon)
  const size = height;
  const iconGid = `g-icon-${live ? "live" : "static"}`;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {live && <span className="logo-glow" aria-hidden />}
      <svg width={size} height={size} viewBox="0 0 88 93" xmlns="http://www.w3.org/2000/svg" className="relative">
        <defs>
          <linearGradient id={iconGid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#071020" />
          </linearGradient>
        </defs>
        <polygon points="44,3 85,26 85,70 44,93 3,70 3,26" fill={`url(#${iconGid})`} />
        <circle cx="44" cy="48" r="24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.3" />
        <ellipse cx="44" cy="48" rx="11" ry="24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.3" />
        <line x1="20" y1="48" x2="68" y2="48" stroke="rgba(255,255,255,0.14)" strokeWidth="0.9" />
        <line x1="23" y1="34" x2="65" y2="34" stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" />
        <line x1="23" y1="62" x2="65" y2="62" stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" />
        <line x1="44" y1="24" x2="44" y2="72" stroke="#F59E0B" strokeWidth="1.5" opacity="0.9" />
        <line x1="20" y1="48" x2="68" y2="48" stroke="#F59E0B" strokeWidth="1.5" opacity="0.9" />
        <line x1="44" y1="24" x2="44" y2="31" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="44" y1="72" x2="44" y2="65" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="20" y1="48" x2="27" y2="48" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="68" y1="48" x2="61" y2="48" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="41" y="45" width="6" height="6" fill="#F59E0B" transform="rotate(45 44 48)" rx="0.5" />
      </svg>
    </div>
  );
}

export function LiveDot({ label = "LIVE" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-[#10B981]" data-testid="live-indicator">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-[#10B981] opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
      </span>
      {label}
    </span>
  );
}
