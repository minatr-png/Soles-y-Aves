import { getHousehold, listAccounts, listCategories, listMembers, listTransactionsForYear } from "@/lib/data";
import { PanelView } from "@/components/panel-view";
import { signOut } from "@/app/actions";

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const household = await getHousehold();

  if (!household) {
    return (
      <div className="glass-card">
        <p className="kicker">Panel</p>
        <p className="mt-2 text-sm text-[rgba(32,30,29,.7)]">
          Tu usuario no pertenece a ningún household todavía.
        </p>
      </div>
    );
  }

  const yParam = Array.isArray(params.y) ? params.y[0] : params.y;
  const year = yParam ? Number(yParam) : new Date().getFullYear();

  const [members, accounts, categories, transactions] = await Promise.all([
    listMembers(household.id),
    listAccounts(household.id),
    listCategories(household.id),
    listTransactionsForYear(household.id, year),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PanelView
        year={year}
        members={members}
        accounts={accounts}
        categories={categories}
        transactions={transactions}
      />
      <form action={signOut}>
        <button type="submit" className="text-sm underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
