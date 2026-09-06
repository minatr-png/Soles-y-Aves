import { getHousehold, listMembers } from "@/lib/data";
import { ChromeHeader } from "@/components/chrome-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const household = await getHousehold();
  const members = household ? await listMembers(household.id) : [];

  return (
    <>
      <div className="app-shell-bg" aria-hidden>
        <div className="blob blob-red" />
        <div className="blob blob-ink" />
        <div className="blob blob-salmon" />
      </div>

      <ChromeHeader members={members} />

      <main className="content-column">{children}</main>
    </>
  );
}
