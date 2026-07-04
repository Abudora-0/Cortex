"use client";

import { signIn } from "next-auth/react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectDriveButton({ label = "Connect Google Drive" }: { label?: string }) {
  // Drive is a separate, incremental provider (src/lib/auth.ts) so it stays off
  // the base login flow - this triggers the one consent that grants Drive.
  return (
    <Button variant="secondary" onClick={() => signIn("google-drive", { callbackUrl: "/drive" })}>
      <FolderOpen size={15} /> {label}
    </Button>
  );
}
