import {
  getHousehold,
  listAccounts,
  listCategories,
  listMembers,
  listTransactionsForYear,
} from "@/lib/data";
import { money, money2, signed } from "@/lib/format";

// Página temporal de la Fase 2: vuelca en crudo lo que devuelve la capa de
// datos para comprobar que Supabase responde. Se retira en fases posteriores.
export default async function DebugDataPage() {
  const household = await getHousehold();

  if (!household) {
    return (
      <div className="p-6">
        <p>
          Tu usuario no pertenece a ningún household todavía (falta una fila en
          household_members).
        </p>
      </div>
    );
  }

  const year = new Date().getFullYear();
  const [members, accounts, categories, transactions] = await Promise.all([
    listMembers(household.id),
    listAccounts(household.id),
    listCategories(household.id),
    listTransactionsForYear(household.id, year),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6 font-mono text-sm">
      <section>
        <h2 className="font-bold">Household</h2>
        <pre>{JSON.stringify(household, null, 2)}</pre>
      </section>

      <section>
        <h2 className="font-bold">Miembros ({members.length})</h2>
        <pre>{JSON.stringify(members, null, 2)}</pre>
      </section>

      <section>
        <h2 className="font-bold">Cuentas ({accounts.length})</h2>
        <pre>{JSON.stringify(accounts, null, 2)}</pre>
      </section>

      <section>
        <h2 className="font-bold">Categorías ({categories.length})</h2>
        <pre>{JSON.stringify(categories, null, 2)}</pre>
      </section>

      <section>
        <h2 className="font-bold">
          Movimientos de {year} ({transactions.length})
        </h2>
        <pre>{JSON.stringify(transactions, null, 2)}</pre>
      </section>

      <section>
        <h2 className="font-bold">Helpers de formato</h2>
        <ul className="list-disc pl-5">
          <li>money(125700) = {money(125700)}</li>
          <li>money2(6300) = {money2(6300)}</li>
          <li>signed(125700) = {signed(125700)}</li>
          <li>signed(-6300, 2) = {signed(-6300, 2)}</li>
          <li>signed(0) = {signed(0)}</li>
        </ul>
      </section>
    </div>
  );
}
