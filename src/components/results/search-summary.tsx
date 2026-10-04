import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";

/** The search in a pill; clicking it goes back to the landing page to change it. */
export function SearchSummary({
  from,
  dateLabel,
  walkLabel,
  driveLabel,
  editHref,
}: {
  from: string;
  dateLabel: string;
  walkLabel: string;
  driveLabel: string;
  editHref: string;
}) {
  return (
    <Link
      href={editHref}
      aria-label={`Edit search: from ${from}, ${dateLabel}, ${walkLabel}, ${driveLabel}`}
      className="flex min-w-0 max-w-full items-center gap-2.5 rounded-full bg-surface py-2 pl-3.5 pr-3 text-sm text-bark ring-1 ring-dune transition-colors hover:ring-moss"
    >
      <MapPin className="size-4 shrink-0 text-moss" aria-hidden="true" />
      <span className="truncate font-semibold">{from}</span>
      <span className="hidden h-4 w-px bg-dune sm:block" aria-hidden="true" />
      <span className="hidden whitespace-nowrap sm:inline">{dateLabel}</span>
      <span className="hidden h-4 w-px bg-dune md:block" aria-hidden="true" />
      <span className="hidden whitespace-nowrap md:inline">{walkLabel}</span>
      <span className="hidden h-4 w-px bg-dune md:block" aria-hidden="true" />
      <span className="hidden whitespace-nowrap md:inline">{driveLabel}</span>
      <Pencil className="ml-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
