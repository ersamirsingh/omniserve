
import React from 'react';
import { Lock } from 'lucide-react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import ThemedImage from './ThemedImage';

export default function ProductShowcase({ src, lightSrc, darkSrc, alt, variant }) {
  const resolvedTheme = useResolvedTheme();
  
  // If variant is not explicitly provided, adapt to resolvedTheme.
  const isDark = variant !== undefined ? variant === 'dark' : resolvedTheme === 'dark';

  return (
    <div
      className={`relative z-10 w-full overflow-hidden rounded-[1.35rem] border shadow-2xl transition duration-500 group ${
        isDark
          ? 'border-white/10 bg-white/10 shadow-black/30'
          : 'border-lp-border bg-white/95 shadow-slate-950/10 dark:bg-[#0f172a]/95'
      }`}
    >
      <div
        className={`flex items-center justify-between border-b px-4 py-3 select-none md:px-5 ${
          isDark
            ? 'border-white/10 bg-white/8'
            : 'border-lp-border bg-surface-container-low/80 dark:bg-white/5'
        }`}
      >
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#fb7185]"></span>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#fbbf24]"></span>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#34d399]"></span>
        </div>

        <div
          className={`mx-3 flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border px-3 py-1.5 ${
            isDark
              ? 'border-white/10 bg-black/25 text-white/70'
              : 'border-lp-border bg-white text-lp-text-secondary dark:bg-[#020617]'
          }`}
        >
          <Lock className="h-3 w-3 shrink-0 text-lp-success" />
          <span className="select-all font-mono text-[11px] font-semibold leading-none">
            app.omniserve.io/cockpit
          </span>
        </div>

        <div className="hidden w-10 shrink-0 sm:block"></div>
      </div>

      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[#0f172a]">
        <ThemedImage
          src={src}
          lightSrc={lightSrc}
          darkSrc={darkSrc}
          alt={alt}
          className="h-full w-full object-fill transition duration-700 group-hover:scale-[1.01]"
          loading="eager"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.1))]"></div>
      </div>
    </div>
  );
}
