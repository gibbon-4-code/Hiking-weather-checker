import { redirect } from "next/navigation";
import { getViewer, signOut } from "@/auth";
import { ResultsPage } from "@/components/results/results-page";
import { authMode } from "@/lib/env";
import { parseSearch, searchQuery } from "@/lib/search";

export default async function Results({ searchParams }: PageProps<"/results">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  // No starting point means nothing to search: go back and ask for one.
  const search = parseSearch(await searchParams);
  if (!search) redirect("/");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <ResultsPage
      // A new search starts from a clean slate: top of the list, default sort.
      key={searchQuery(search)}
      viewer={viewer}
      signOutAction={authMode === "enabled" ? signOutAction : null}
      localPreview={authMode === "local-bypass"}
      search={search}
    />
  );
}
