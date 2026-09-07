import {
  getHousehold,
  listAccounts,
  listAllTransactions,
  listCategories,
  listMembers,
} from "@/lib/data";
import { MovimientosView } from "@/components/movimientos-view";

export default async function MovimientosPage() {
  const household = await getHousehold();

  if (!household) {
    return (
      <div className="glass-card">
        <p className="kicker">Movimientos</p>
        <p className="mt-2 text-sm text-[rgba(32,30,29,.7)]">
          Tu usuario no pertenece a ningún household todavía.
        </p>
      </div>
    );
  }

  const [members, accounts, categories, transactions] = await Promise.all([
    listMembers(household.id),
    listAccounts(household.id),
    listCategories(household.id),
    listAllTransactions(household.id),
  ]);

  return (
    <MovimientosView
      members={members}
      accounts={accounts}
      categories={categories}
      transactions={transactions}
    />
  );
}
