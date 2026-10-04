"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Search } from "@/lib/search";

/** The search in a pill; clicking it opens the search form over the results, so you can change it in place. */
export function SearchSummary({
  search,
  from,
  dateLabel,
  walkLabel,
  driveLabel,
}: {
  search: Search;
  from: string;
  dateLabel: string;
  walkLabel: string;
  driveLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Change your search</DialogTitle>
            <DialogDescription>Your results update as soon as you search.</DialogDescription>
          </DialogHeader>
          {/* Only mounted while open, so it always starts from the search you're looking at. */}
          {open && <SearchForm initial={search} variant="panel" onSearch={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
