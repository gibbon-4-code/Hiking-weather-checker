import Link from "next/link";
import { redirect } from "next/navigation";
import { CloudSun, Mountain, Route, ShieldCheck } from "lucide-react";
import { getViewer, signIn } from "@/auth";
import { GithubMark } from "@/components/github-mark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authMode } from "@/lib/env";

const ERRORS: Record<string, string> = {
  AccessDenied: "That GitHub account isn't on the allowlist for this app.",
  Configuration: "Sign-in is misconfigured on the server. Check the AUTH_* environment variables.",
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const { error } = await searchParams;
  if (authMode === "enabled" && (await getViewer())) redirect("/");

  async function signInAction() {
    "use server";
    await signIn("github", { redirectTo: "/" });
  }

  const errorKey = typeof error === "string" ? error : undefined;

  return (
    <main className="flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--color-secondary),transparent_60%)] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mountain className="size-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Summit Planner</h1>
            <p className="text-sm text-muted-foreground">Where should you hike next?</p>
          </div>
        </div>

        <ul className="mb-8 space-y-3 text-sm">
          <li className="flex gap-3">
            <CloudSun className="mt-0.5 size-4 shrink-0 text-primary" />
            Met Office summit forecasts for Saturday and Sunday on eight UK hills
          </li>
          <li className="flex gap-3">
            <Route className="mt-0.5 size-4 shrink-0 text-primary" />
            Real drive times from home, with a heads-up when you&apos;ll need a hotel
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            One recommendation that weighs weather, distance and how good the hike is
          </li>
        </ul>

        {errorKey && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
            <AlertDescription>{ERRORS[errorKey] ?? "Something went wrong. Please try again."}</AlertDescription>
          </Alert>
        )}

        {authMode === "enabled" && (
          <form action={signInAction}>
            <Button type="submit" size="lg" className="h-11 w-full text-base">
              <GithubMark /> Sign in with GitHub
            </Button>
          </form>
        )}

        {authMode === "local-bypass" && (
          <Alert>
            <AlertTitle>Sign-in isn&apos;t set up yet</AlertTitle>
            <AlertDescription>
              <p>
                This is a local preview, so the dashboard is open. Add the <code>AUTH_*</code> variables from{" "}
                <code>.env.example</code> to turn on GitHub sign-in.
              </p>
              <Link href="/" className="mt-2 inline-block font-medium text-primary underline underline-offset-4">
                Open the dashboard
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {authMode === "misconfigured" && (
          <Alert variant="destructive">
            <AlertTitle>Sign-in isn&apos;t configured</AlertTitle>
            <AlertDescription>
              This deployment is missing AUTH_SECRET, AUTH_GITHUB_ID or AUTH_GITHUB_SECRET, so the forecast is locked.
              Add them in your hosting provider&apos;s environment variables and redeploy.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
