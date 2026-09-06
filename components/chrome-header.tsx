"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { HouseholdMember } from "@/lib/supabase/types";

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
  const currentOwner = searchParams.get("owner") ?? "all";

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
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand-group">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">Ahorros</span>
          <span className="brand-sub">Cuentas compartidas</span>
        </div>

        <div className="person-filter" role="group" aria-label="Filtro de personas">
          {personOptions.map((option) => (
            <Link
              key={option.value}
              href={ownerHref(option.value)}
              className="person-filter-btn"
              data-active={currentOwner === option.value}
            >
              {option.label}
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
  );
}
