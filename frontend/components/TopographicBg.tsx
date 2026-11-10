"use client";

import { usePathname } from 'next/navigation';

export function TopographicBg() {
  const pathname = usePathname();

  if (pathname === '/' || pathname === '/mapa-3d') {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-hidden z-0 select-none">
      {/* Brilho sutil de horizonte */}
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[560px] h-[300px] rounded-full blur-[110px] opacity-25"
        style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
      />

      {/* Curvas topográficas e silhueta expressiva de encosta */}
      <svg
        viewBox="0 0 1440 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
        className="w-full h-full object-cover opacity-90"
      >
        <g stroke="var(--mountain-stroke)" strokeOpacity="0.65" strokeWidth="1.2" strokeDasharray="6 6">
          <path d="M-100 85 Q 380 20, 820 100 T 1540 60" />
          <path d="M-100 140 Q 430 70, 880 150 T 1540 110" />
        </g>

        <path
          d="M0 265 L220 175 L470 235 L760 145 L1050 225 L1290 160 L1440 210 L1440 380 L0 380 Z"
          fill="var(--mountain-1)"
        />
        <path
          d="M0 305 L310 215 L620 275 L940 190 L1210 255 L1440 220 L1440 380 L0 380 Z"
          fill="var(--mountain-2)"
        />
        <path
          d="M0 265 L220 175 L470 235 L760 145 L1050 225 L1290 160 L1440 210"
          stroke="var(--mountain-stroke)"
          strokeWidth="1.8"
        />
        <path
          d="M0 305 L310 215 L620 275 L940 190 L1210 255 L1440 220"
          stroke="var(--mountain-stroke)"
          strokeWidth="2"
        />
      </svg>

      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{ background: 'linear-gradient(to top, var(--background) 15%, transparent 100%)' }}
      />
    </div>
  );
}
