import {
  getHousehold,
  listAccounts,
  listCategories,
  listMembers,
  listTransactionsForYear,
} from "@/lib/data";
import { AnoView } from "@/components/ano-view";

export default async function AnoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const household = await getHousehold();

  if (!household) {
    return (
      <div className="glass-card">
        <p className="kicker">Año</p>
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
    <AnoView
      year={year}
      members={members}
      accounts={accounts}
      categories={categories}
      transactions={transactions}
    />
  );
}
