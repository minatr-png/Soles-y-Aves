import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-6">
      <p>Sesión iniciada como {user?.email}.</p>
      <form action={signOut}>
        <button type="submit" className="mt-4 underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
