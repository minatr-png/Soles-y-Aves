import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <div className="app-shell-bg" aria-hidden>
        <div className="blob blob-red" />
        <div className="blob blob-ink" />
        <div className="blob blob-salmon" />
      </div>

      <div className="auth-shell">
        <LoginForm />
      </div>
    </>
  );
}
