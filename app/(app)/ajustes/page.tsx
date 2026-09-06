import {
  getHousehold,
  listAccounts,
  listAllTransactions,
  listCategories,
  listMembers,
} from "@/lib/data";
import { AjustesView } from "@/components/ajustes-view";

export default async function AjustesPage() {
  const household = await getHousehold();

  if (!household) {
    return (
      <div className="glass-card">
        <p className="kicker">Categorías y cuentas</p>
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
    <AjustesView
      householdId={household.id}
      members={members}
      accounts={accounts}
      categories={categories}
      transactions={transactions}
    />
  );
}
