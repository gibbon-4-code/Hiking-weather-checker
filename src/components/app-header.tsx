import Link from "next/link";
import { LogOut, SlidersHorizontal } from "lucide-react";
import type { Viewer } from "@/auth";
import { cn } from "@/lib/utils";

/** Over the landing photo it's transparent and white; on the results page it's solid and sticky. */
export function AppHeader({
  variant = "solid",
  viewer,
  signOutAction,
  onSettings,
  children,
}: {
  variant?: "overlay" | "solid";
  viewer: Viewer;
  signOutAction: (() => Promise<void>) | null;
  onSettings: () => void;
  children?: React.ReactNode;
}) {
  const overlay = variant === "overlay";
  const quiet = overlay
    ? "text-white/90 hover:bg-white/10 hover:text-white"
    : "text-muted-foreground hover:bg-dune/40 hover:text-bark";
  return (
    <header
      className={
        overlay ? "absolute inset-x-0 top-0 z-20" : "sticky top-0 z-30 border-b border-dune/70 bg-sand/95 backdrop-blur"
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 md:px-8">
        <Link href="/" className={cn("flex shrink-0 items-center gap-2", overlay ? "text-white" : "text-pine")}>
          <svg viewBox="0 0 28 18" className="h-[18px] w-7" aria-hidden="true">
            <path d="M1 17 L9 5 L13 10 L18 2 L27 17 Z" fill="currentColor" />
          </svg>
          <span className={cn("font-display text-lg font-extrabold", children && "hidden sm:inline")}>
            Weekend Summits
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">{children}</div>
        <button
          type="button"
          onClick={onSettings}
          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors", quiet)}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
        {viewer.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={viewer.image} alt={viewer.name ?? ""} title={viewer.name ?? undefined} className="size-8 shrink-0 rounded-full" />
        ) : (
          <span
            title={viewer.name ?? undefined}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              overlay ? "bg-white/20 text-white" : "bg-moss text-surface",
            )}
          >
            {(viewer.name ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        {signOutAction && (
          <form action={signOutAction}>
            <button type="submit" aria-label="Sign out" className={cn("rounded-lg p-2 transition-colors", quiet)}>
              <LogOut className="size-4" />
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
