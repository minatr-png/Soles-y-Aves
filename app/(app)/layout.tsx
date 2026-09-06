import { getHousehold, listAccounts, listCategories, listMembers } from "@/lib/data";
import { ChromeHeader } from "@/components/chrome-header";
import { MovementSheetProvider } from "@/components/movement-sheet";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const household = await getHousehold();
  const [members, accounts, categories] = household
    ? await Promise.all([
        listMembers(household.id),
        listAccounts(household.id),
        listCategories(household.id),
      ])
    : [[], [], []];

  return (
    <>
      <div className="app-shell-bg" aria-hidden>
        <div className="blob blob-red" />
        <div className="blob blob-ink" />
        <div className="blob blob-salmon" />
      </div>

      <ChromeHeader members={members} />

      {household ? (
        <MovementSheetProvider
          householdId={household.id}
          accounts={accounts}
          categories={categories}
          members={members}
        >
          <main className="content-column">{children}</main>
        </MovementSheetProvider>
      ) : (
        <main className="content-column">{children}</main>
      )}
    </>
  );
}
