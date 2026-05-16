"use client";

import type { ReactNode } from "react";
import { AtmosphereBackground } from "@/components/atmosphere-background";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <AtmosphereBackground variant="marketing" />
      <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
