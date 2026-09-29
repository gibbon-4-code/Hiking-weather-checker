import { connection } from "next/server";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { authMode, env } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    signIn({ user, profile }) {
      const login = typeof profile?.login === "string" ? profile.login.toLowerCase() : "";
      const email = user.email?.toLowerCase() ?? "";
      return (
        (login !== "" && env.allowedGithubUsers.includes(login)) ||
        (email !== "" && env.allowedEmails.includes(email))
      );
    },
  },
});

export interface Viewer {
  name: string;
  image: string | null;
}

/** Returns the signed-in person, a local stand-in when sign-in is bypassed in development, or null. */
export async function getViewer(): Promise<Viewer | null> {
  await connection();
  if (authMode === "local-bypass") return { name: "Local preview", image: null };
  if (authMode === "misconfigured") return null;
  const session = await auth();
  if (!session?.user) return null;
  return { name: session.user.name ?? session.user.email ?? "Hiker", image: session.user.image ?? null };
}
