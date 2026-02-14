"use client";

import { useAccessibility } from "@/context/AccessibilityContext";
import { cn } from "@/lib/utils";

export default function FontSizeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useAccessibility();

  return (
    <div
      className={cn(
        state.fontSize === "large" && "font-size-large",
        state.fontSize === "xlarge" && "font-size-xlarge"
      )}
    >
      {children}
    </div>
  );
}
