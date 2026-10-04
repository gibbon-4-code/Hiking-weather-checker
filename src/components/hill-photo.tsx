import { PHOTOS } from "@/data/mountains/photos";
import { cn } from "@/lib/utils";

/**
 * A destination's photo from Wikimedia Commons. Plain <img> rather than next/image: Wikimedia
 * already serves a resized copy, so there's nothing to gain from resizing it again.
 */
export function HillPhoto({
  id,
  alt,
  className,
  eager,
}: {
  id: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const photo = PHOTOS[id];
  if (!photo) return <div className={cn("bg-dune/50", className)} aria-hidden="true" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}

/** The credit each photo's licence asks for, linking to its page on Commons. */
export function PhotoCredit({ id, className }: { id: string; className?: string }) {
  const photo = PHOTOS[id];
  if (!photo) return null;
  return (
    <a
      href={photo.page}
      target="_blank"
      rel="noreferrer"
      className={cn("text-[11px] underline-offset-2 hover:underline", className)}
    >
      Photo: {photo.author} · {photo.license}
    </a>
  );
}
