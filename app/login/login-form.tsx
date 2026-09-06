"use client";

import { useActionState, useState } from "react";
import {
  sendCode,
  verifyCode,
  type SendCodeState,
  type VerifyCodeState,
} from "./actions";

const initialSendState: SendCodeState = { status: "idle", message: "" };
const initialVerifyState: VerifyCodeState = { status: "idle", message: "" };

export function LoginForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  const [sendState, setSendState] = useState<SendCodeState>(initialSendState);
  const [sendPending, setSendPending] = useState(false);

  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyCode,
    initialVerifyState,
  );

  async function handleSend(formData: FormData) {
    setSendPending(true);
    const result = await sendCode(initialSendState, formData);
    setSendPending(false);
    setSendState(result);
    if (result.status === "success") {
      setStep("code");
    }
  }

  if (step === "code") {
    return (
      <form action={verifyAction} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-2xl font-bold">Ahorros</h1>
        <p className="text-sm text-zinc-600">
          Introduce el código de 6 dígitos que hemos enviado a {email}.
        </p>

        <input type="hidden" name="email" value={email} />

        <label htmlFor="token" className="text-sm font-medium">
          Código de acceso
        </label>
        <input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="123456"
          className="rounded-md border border-zinc-300 px-3 py-2 text-lg tracking-widest"
        />

        <button
          type="submit"
          disabled={verifyPending}
          className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {verifyPending ? "Comprobando…" : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => setStep("email")}
          className="text-sm text-zinc-500 underline"
        >
          Usar otro correo
        </button>

        {verifyState.status === "error" && (
          <p className="text-sm text-red-600">{verifyState.message}</p>
        )}
      </form>
    );
  }

  return (
    <form action={handleSend} className="flex w-full max-w-sm flex-col gap-3">
      <h1 className="text-2xl font-bold">Ahorros</h1>
      <p className="text-sm text-zinc-600">
        Inicia sesión con un código enviado a tu correo.
      </p>

      <label htmlFor="email" className="text-sm font-medium">
        Correo electrónico
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="rounded-md border border-zinc-300 px-3 py-2"
      />

      <button
        type="submit"
        disabled={sendPending}
        className="rounded-md bg-zinc-900 px-3 py-2 font-medium text-white disabled:opacity-50"
      >
        {sendPending ? "Enviando…" : "Enviar código de acceso"}
      </button>

      {sendState.status === "error" && (
        <p className="text-sm text-red-600">{sendState.message}</p>
      )}
    </form>
  );
}
