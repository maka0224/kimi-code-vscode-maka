export function KimiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="K">
      <circle cx="100" cy="100" r="96" fill="#EFE6D2" />
      <path
        d="M48 44 L48 156 L76 156 L76 120 L88 108 L120 156 L152 156 L108 96 L148 44 L114 44 L76 90 L76 44 Z"
        fill="#8C7350"
        stroke="#6E5836"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="128" cy="82" r="34" fill="#EAD9BD" stroke="#B49A72" strokeWidth="3" />
      <path d="M122 52 Q126 38 128 42 Q130 38 134 52 Q128 48 122 52 Z" fill="#C9B48C" />
      <circle cx="118" cy="78" r="6.5" fill="#4A3B28" />
      <circle cx="140" cy="78" r="6.5" fill="#4A3B28" />
      <circle cx="120" cy="76" r="2.2" fill="#FFFFFF" />
      <circle cx="142" cy="76" r="2.2" fill="#FFFFFF" />
      <ellipse cx="129" cy="88" rx="3" ry="2.4" fill="#C9A87E" />
      <path d="M120 96 Q129 103 138 96" fill="none" stroke="#8C7350" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
