import { redirect } from "next/navigation";
import { getViewer, signOut } from "@/auth";
import { Dashboard } from "@/components/dashboard";
import { authMode } from "@/lib/env";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <Dashboard
      viewer={viewer}
      signOutAction={authMode === "enabled" ? signOutAction : null}
      localPreview={authMode === "local-bypass"}
    />
  );
}
