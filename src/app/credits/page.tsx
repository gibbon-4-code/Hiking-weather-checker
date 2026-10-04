import type { Metadata } from "next";
import Link from "next/link";
import { MOUNTAINS } from "@/data/mountains";
import { PHOTOS } from "@/data/mountains/photos";

export const metadata: Metadata = { title: "Photo credits · Summit Planner" };

/** Every photo's author and licence, as their licences ask. Public, like the photos themselves. */
export default function Credits() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 md:px-8">
      <Link href="/" className="text-sm font-medium text-moss underline underline-offset-4">
        Back to Summit Planner
      </Link>
      <h1 className="mt-6 font-display text-4xl font-extrabold text-bark">Photo credits</h1>
      <p className="mt-2 text-muted-foreground">
        All photos come from Wikimedia Commons. Each links to its page there, with the full licence.
      </p>
      <ul className="mt-8 divide-y divide-dune/70 border-y border-dune/70">
        {MOUNTAINS.map((m) => {
          const photo = PHOTOS[m.id];
          if (!photo) return null;
          return (
            <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
              <span className="font-semibold text-bark">{m.name}</span>
              <a href={photo.page} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
                {photo.author} · {photo.license}
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
