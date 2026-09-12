"use client";

import { useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

// Category-specific privacy: Regalos amounts stay blurred until tapped, on every screen that shows them.
const BLURRED_CATEGORY_ID = "b30560c5-694a-4445-9ff7-044329834320";

export function isBlurredCategoryId(categoryId: string | null | undefined) {
  return categoryId === BLURRED_CATEGORY_ID;
}

type Props = {
  categoryId: string | null | undefined;
  className?: string;
  children: ReactNode;
};

export function BlurredAmount({ categoryId, className, children }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!isBlurredCategoryId(categoryId)) {
    return <span className={className}>{children}</span>;
  }

  function toggle(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    setRevealed((v) => !v);
  }

  return (
    <span
      className={[className, "blur-amount", revealed ? "blur-amount-revealed" : ""]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      aria-pressed={revealed}
      aria-label={revealed ? "Ocultar importe" : "Mostrar importe"}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(e);
        }
      }}
    >
      {children}
    </span>
  );
}
