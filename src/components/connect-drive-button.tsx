"use client";

import { signIn } from "next-auth/react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectDriveButton({ label = "Connect Google Drive" }: { label?: string }) {
  // The Drive scope + prompt=consent are configured on the Google provider
  // (src/lib/auth.ts), so a plain re-sign-in re-consents and refreshes scope.
  return (
    <Button variant="secondary" onClick={() => signIn("google", { callbackUrl: "/drive" })}>
      <FolderOpen size={15} /> {label}
    </Button>
  );
}
