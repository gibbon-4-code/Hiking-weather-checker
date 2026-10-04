import { redirect } from "next/navigation";
import { getViewer, signOut } from "@/auth";
import { Landing } from "@/components/landing";
import { MOUNTAINS } from "@/data/mountains";
import { authMode } from "@/lib/env";
import { parseSearch } from "@/lib/search";

export default async function Home({ searchParams }: PageProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <Landing
      viewer={viewer}
      signOutAction={authMode === "enabled" ? signOutAction : null}
      mountainCount={MOUNTAINS.length}
      search={parseSearch(await searchParams)}
    />
  );
}
