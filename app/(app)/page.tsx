import { signOut } from "@/app/actions";

export default function PanelPage() {
  return (
    <div className="glass-card">
      <p className="kicker">Panel</p>
      <p className="mt-2 text-sm text-[rgba(32,30,29,.7)]">Vista pendiente (fase 4).</p>
      <form action={signOut} className="mt-4">
        <button type="submit" className="text-sm underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
