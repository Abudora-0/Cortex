import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { PageTransition } from "@/components/page-transition";

async function doSignOut() {
  "use server";
  await signOut({ redirectTo: "/signin" });
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const name = session.user.name ?? session.user.email ?? "Student";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const collapsed = (await cookies()).get("cortex-sidebar")?.value === "1";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        name={name}
        initials={initials}
        signOutAction={doSignOut}
        defaultCollapsed={collapsed}
      />
      <main className="app-aura min-w-0 flex-1 px-6 py-8 lg:px-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
