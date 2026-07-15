"use client";

import { Button } from "@/components/ui/button";

export function DangerZoneButton({
  children,
  confirmMessage,
}: {
  children: React.ReactNode;
  confirmMessage: string;
}) {
  return (
    <Button
      type="submit"
      variant="destructive"
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
