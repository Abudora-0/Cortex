import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { PageTransition } from "@/components/page-transition";
import { LogOut } from "lucide-react";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar
        footer={
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brass-500 font-display text-xs font-bold text-[#1c1917]">
              {initials}
            </span>
            <span className="hidden min-w-0 flex-1 truncate text-xs text-sidebar-fg/70 lg:block">
              {name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button
                type="submit"
                title="Sign out"
                className="rounded-md p-1.5 text-sidebar-fg/50 transition-colors hover:bg-white/10 hover:text-sidebar-fg"
              >
                <LogOut size={15} />
              </button>
            </form>
          </div>
        }
      />
      <main className="app-aura min-w-0 flex-1 px-6 py-8 lg:px-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
