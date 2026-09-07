import { Suspense } from "react";
import { getHousehold, listAccounts, listCategories, listMembers } from "@/lib/data";
import { ChromeHeader, ChromeHeaderFallback } from "@/components/chrome-header";
import { MovementSheetProvider, type MovementSheetData } from "@/components/movement-sheet";
import type { Household } from "@/lib/supabase/types";

async function getMovementSheetData(
  householdPromise: Promise<Household | null>,
): Promise<MovementSheetData | null> {
  const household = await householdPromise;
  if (!household) return null;

  const [accounts, categories, members] = await Promise.all([
    listAccounts(household.id),
    listCategories(household.id),
    listMembers(household.id),
  ]);

  return { householdId: household.id, accounts, categories, members };
}

async function ChromeHeaderAsync({
  householdPromise,
}: {
  householdPromise: Promise<Household | null>;
}) {
  const household = await householdPromise;
  const members = household ? await listMembers(household.id) : [];
  return <ChromeHeader members={members} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const householdPromise = getHousehold();
  const movementDataPromise = getMovementSheetData(householdPromise);

  return (
    <>
      <div className="app-shell-bg" aria-hidden>
        <div className="blob blob-red" />
        <div className="blob blob-ink" />
        <div className="blob blob-salmon" />
      </div>

      <Suspense fallback={<ChromeHeaderFallback />}>
        <ChromeHeaderAsync householdPromise={householdPromise} />
      </Suspense>

      <MovementSheetProvider dataPromise={movementDataPromise}>
        <main className="content-column">{children}</main>
      </MovementSheetProvider>
    </>
  );
}
