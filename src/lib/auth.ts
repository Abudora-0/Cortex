import NextAuth, { type NextAuthConfig } from "next-auth";
import { redirect } from "next/navigation";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db";

const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
// Dev-login is a local-development convenience only - never surfaced in prod.
const devLoginEnabled = process.env.NODE_ENV === "development";

const providers: NextAuthConfig["providers"] = [];

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

if (hasGoogle) {
  providers.push(
    // Base login. Only non-sensitive scopes (email/profile), so the app can be
    // published to production with no verification, no "unverified app" warning
    // and no 100-user cap - anyone can just sign in with Google.
    Google({
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { scope: "openid email profile" },
      },
    }),
    // Optional, incremental Drive access. Requested only when the user clicks
    // "Connect Drive" (a separate provider id keeps it off the login flow).
    // Only this grant touches the restricted drive.readonly scope.
    Google({
      id: "google-drive",
      name: "Google Drive",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
          scope: `openid email profile ${DRIVE_SCOPE}`,
        },
      },
    })
  );
}

if (devLoginEnabled) {
  const devSchema = z.object({
    email: z.string().email().max(120),
    name: z.string().max(60).optional(),
  });
  providers.push(
    Credentials({
      id: "devlogin",
      name: "Dev login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const parsed = devSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const name = parsed.data.name?.trim() || email.split("@")[0];
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name },
        });
        return user;
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/signin" },
  trustHost: true,
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) token.id = user.id;
      // Auth.js persists Account.scope/tokens only on the FIRST link. On a
      // re-login (e.g. re-consenting to add Drive), refresh them ourselves so
      // getDriveStatus() sees the newly granted scope. `account` is only
      // present at sign-in, so this runs once per login, not per request.
      if (account?.provider === "google" || account?.provider === "google-drive") {
        await prisma.account.updateMany({
          where: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            id_token: account.id_token,
            // Google only returns a refresh_token with prompt=consent; keep
            // the existing one if this response didn't include a fresh one.
            refresh_token: account.refresh_token ?? undefined,
          },
        });
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export const googleAuthEnabled = hasGoogle;
export const devLoginAuthEnabled = devLoginEnabled;

/**
 * Page-level guard. Layouts and pages render in parallel in the App Router,
 * so the (app) layout's redirect does NOT stop a page from executing -
 * every authenticated page must call this itself.
 */
export async function requireUser() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/signin");
  return { id: user.id, name: user.name ?? null, email: user.email ?? null };
}

/** Server-side helper: current user id or throw (use in server actions). */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}
