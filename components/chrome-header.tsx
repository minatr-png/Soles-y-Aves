"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HouseholdMember } from "@/lib/supabase/types";

// Reports whether the <Link> it's nested in is still navigating, so the
// parent can surface a loading toast instead of the filter silently doing
// nothing for however long the fetch takes.
function FilterLinkStatus({ value, onPendingChange }: { value: string; onPendingChange: (value: string, pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onPendingChange(value, pending);
    return () => onPendingChange(value, false);
  }, [value, pending, onPendingChange]);
  return null;
}

const TABS = [
  { href: "/", label: "Panel" },
  { href: "/ano", label: "Año" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/ajustes", label: "Categorías y cuentas" },
];

type Props = {
  members: HouseholdMember[];
};

export function ChromeHeader({ members }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actualOwner = searchParams.get("owner") ?? "all";

  // Marks the clicked button active immediately, instead of waiting for the
  // navigation (and whatever data it depends on) to actually complete. Reset
  // during render (not an effect) once the URL catches up to the click.
  const [prevActualOwner, setPrevActualOwner] = useState(actualOwner);
  const [pendingOwner, setPendingOwner] = useState<string | null>(null);
  if (actualOwner !== prevActualOwner) {
    setPrevActualOwner(actualOwner);
    setPendingOwner(null);
  }
  const currentOwner = pendingOwner ?? actualOwner;

  const filterRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [pillRect, setPillRect] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const container = filterRef.current;
    const active = buttonRefs.current.get(currentOwner);
    if (!container || !active) return;

    function measure() {
      const containerRect = container!.getBoundingClientRect();
      const activeRect = active!.getBoundingClientRect();
      setPillRect({
        left: activeRect.left - containerRect.left,
        top: activeRect.top - containerRect.top,
        width: activeRect.width,
        height: activeRect.height,
      });
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [currentOwner, members]);

  const [pendingLinks, setPendingLinks] = useState<Set<string>>(new Set());
  const handlePendingChange = useCallback((value: string, pending: boolean) => {
    setPendingLinks((prev) => {
      const isPending = prev.has(value);
      if (pending === isPending) return prev;
      const next = new Set(prev);
      if (pending) next.add(value);
      else next.delete(value);
      return next;
    });
  }, []);
  const isFilterLoading = pendingLinks.size > 0;

  const personOptions = [
    { value: "all", label: "Todo" },
    { value: "a", label: members[0]?.display_name ?? "Miembro 1" },
    { value: "b", label: members[1]?.display_name ?? "Miembro 2" },
    { value: "j", label: "Conjunta" },
  ];

  function ownerHref(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("owner");
    } else {
      params.set("owner", value);
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function tabHref(href: string) {
    const qs = searchParams.toString();
    return qs ? `${href}?${qs}` : href;
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand-group">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">Ahorros</span>
          </div>

          <div className="person-filter" role="group" aria-label="Filtro de personas" ref={filterRef}>
            <span
              className="person-filter-pill"
              aria-hidden
              style={
                pillRect
                  ? {
                      transform: `translate(${pillRect.left}px, ${pillRect.top}px)`,
                      width: pillRect.width,
                      height: pillRect.height,
                      opacity: 1,
                    }
                  : { opacity: 0 }
              }
            />
            {personOptions.map((option) => (
              <Link
                key={option.value}
                ref={(el) => {
                  if (el) buttonRefs.current.set(option.value, el);
                  else buttonRefs.current.delete(option.value);
                }}
                href={ownerHref(option.value)}
                className="person-filter-btn"
                data-active={currentOwner === option.value}
                onClick={() => setPendingOwner(option.value)}
              >
                {option.label}
                <FilterLinkStatus value={option.value} onPendingChange={handlePendingChange} />
              </Link>
            ))}
          </div>

          <nav className="tab-bar" aria-label="Secciones">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tabHref(tab.href)}
                className="tab-link"
                data-active={pathname === tab.href}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="filter-loading-toast" data-visible={isFilterLoading} role="status" aria-live="polite">
        <span className="filter-loading-spinner" aria-hidden />
        Actualizando…
      </div>
    </>
  );
}
