import { cn } from "@/lib/utils";

type Variant = "marketing" | "app";

const variantClass: Record<Variant, string> = {
  marketing: [
    "from-violet-200/80 via-background to-sky-50/40",
    "dark:from-violet-950/70 dark:via-background dark:to-zinc-950",
  ].join(" "),
  app: [
    "from-zinc-200/50 via-background to-neutral-100/80",
    "dark:from-zinc-950/90 dark:via-background dark:to-black",
  ].join(" "),
};

/**
 * Full-viewport production-style background: grid wash, aurora blobs, micro-noise, vignette.
 * Respects prefers-reduced-motion (animations disabled via CSS).
 */
export function AtmosphereBackground({
  variant = "marketing",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const isMarketing = variant === "marketing";

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
    >
      {/* Base wash */}
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-b",
          variantClass[variant],
        )}
      />

      {/* Structural grid */}
      <div
        className={cn(
          "peblo-grid absolute inset-0",
          isMarketing ? "opacity-[0.45] dark:opacity-[0.5]" : "opacity-[0.35] dark:opacity-[0.4]",
        )}
      />

      {/* Secondary fine mesh (depth) */}
      <div className="peblo-grid-fine absolute inset-0 opacity-30 dark:opacity-25" />

      {/* Aurora blobs — CSS-driven for performance */}
      <div
        className={cn(
          "peblo-aurora-a absolute -left-[20%] top-[-15%] h-[min(85vh,720px)] w-[min(90vw,900px)] rounded-full bg-linear-to-tr blur-3xl",
          isMarketing
            ? "from-fuchsia-500/25 via-violet-500/20 to-transparent dark:from-fuchsia-500/30 dark:via-violet-600/25"
            : "from-violet-500/15 via-indigo-500/10 to-transparent dark:from-violet-600/20 dark:via-indigo-600/12",
        )}
      />
      <div
        className={cn(
          "peblo-aurora-b absolute -right-[15%] top-[25%] h-[min(70vh,560px)] w-[min(75vw,700px)] rounded-full bg-linear-to-bl blur-3xl",
          isMarketing
            ? "from-cyan-400/15 via-violet-400/12 to-transparent dark:from-cyan-500/12 dark:via-violet-500/15"
            : "from-slate-400/10 via-zinc-500/8 to-transparent dark:from-slate-600/15 dark:via-zinc-700/10",
        )}
      />
      <div
        className={cn(
          "peblo-aurora-c absolute bottom-[-20%] left-[15%] h-[min(60vh,480px)] w-[min(80vw,640px)] rounded-full bg-linear-to-t blur-3xl",
          isMarketing
            ? "from-violet-600/20 via-fuchsia-600/10 to-transparent dark:from-violet-500/22 dark:via-fuchsia-600/12"
            : "from-indigo-600/12 to-transparent dark:from-indigo-700/15",
        )}
      />

      {/* Horizon line (studio lighting cue) */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent dark:via-white/10" />

      {/* Film grain / dither */}
      <div className="peblo-film-noise absolute inset-0" />

      {/* Vignette — focus center content */}
      <div className="peblo-vignette absolute inset-0" />
    </div>
  );
}
