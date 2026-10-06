import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  MET_OFFICE_API_KEY: optional,
  ORS_API_KEY: optional,
  ANTHROPIC_API_KEY: optional,
  AUTH_SECRET: optional,
  AUTH_GITHUB_ID: optional,
  AUTH_GITHUB_SECRET: optional,
  ALLOWED_GITHUB_USERS: optional,
  ALLOWED_EMAILS: optional,
  USE_DEMO_DATA: optional,
});

const parsed = schema.parse(process.env);

const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  metOfficeKey: parsed.MET_OFFICE_API_KEY,
  orsKey: parsed.ORS_API_KEY,
  anthropicKey: parsed.ANTHROPIC_API_KEY,
  forceDemoData: parsed.USE_DEMO_DATA === "1" || parsed.USE_DEMO_DATA === "true",
  allowedGithubUsers: list(parsed.ALLOWED_GITHUB_USERS),
  allowedEmails: list(parsed.ALLOWED_EMAILS),
  authConfigured: Boolean(
    parsed.AUTH_SECRET && parsed.AUTH_GITHUB_ID && parsed.AUTH_GITHUB_SECRET,
  ),
  isProduction: process.env.NODE_ENV === "production",
};

/**
 * Local development may run without sign-in so the app is usable before the GitHub OAuth app
 * exists. A production build without sign-in configured refuses to serve data instead.
 */
export const authMode: "enabled" | "local-bypass" | "misconfigured" = env.authConfigured
  ? "enabled"
  : env.isProduction
    ? "misconfigured"
    : "local-bypass";
