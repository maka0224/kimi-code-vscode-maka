export function KimiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="46 32 120 140" className={className} role="img" aria-label="K">
      <g strokeLinejoin="round">
        {/* 侧面（暗） */}
        <path d="M62 148 L78 164 L78 74 L62 58 Z" fill="#0e5fa8" />
        <path d="M104 106 L138 140 L122 156 L88 122 Z" fill="#0e5fa8" />
        <path d="M94 88 L134 48 L150 64 L110 104 Z" fill="#0e5fa8" />
        {/* 正面（亮） */}
        <path d="M62 148 L62 58 L46 42 L46 132 Z" fill="#38bdf8" />
        <path d="M104 106 L88 122 L72 106 L88 90 Z" fill="#38bdf8" />
        <path d="M94 88 L110 104 L150 64 L134 48 Z" fill="#38bdf8" />
        {/* 顶面 */}
        <path d="M46 42 L62 58 L78 74 L62 58 Z" fill="#7dd3fc" />
        <path d="M134 48 L150 64 L166 48 L150 32 Z" fill="#7dd3fc" />
        <path d="M122 156 L138 140 L154 156 L138 172 Z" fill="#7dd3fc" />
      </g>
    </svg>
  );
}
