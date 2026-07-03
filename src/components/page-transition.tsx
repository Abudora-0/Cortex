"use client";

import { usePathname } from "next/navigation";

/** Re-keys on route change so page content gently fades/rises in each time. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="rise">
      {children}
    </div>
  );
}
