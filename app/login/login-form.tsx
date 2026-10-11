"use client";

import { useActionState, useState } from "react";
import { OtpInput } from "./otp-input";
import {
  sendCode,
  verifyCode,
  type SendCodeState,
  type VerifyCodeState,
} from "./actions";

const CODE_LENGTH = 8;

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

  const [code, setCode] = useState("");
  const missing = CODE_LENGTH - code.length;

  async function handleSend(formData: FormData) {
    setSendPending(true);
    const result = await sendCode(initialSendState, formData);
    setSendPending(false);
    setSendState(result);
    if (result.status === "success") {
      setStep("code");
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <div className="brand-mark" />
        <span className="auth-brand-name">Ahorros</span>
      </div>

      <div className="auth-steps" aria-hidden>
        <span className="auth-step-dot" data-active="true" />
        <span className="auth-step-dot" data-active={step === "code"} />
      </div>

      {step === "code" ? (
        <>
          <p className="kicker">Paso 2 de 2</p>
          <p className="auth-lede">
            Introduce el código de {CODE_LENGTH} dígitos que hemos enviado a{" "}
            <strong>{email}</strong>.
          </p>

          <form action={verifyAction} className="auth-form">
            <input type="hidden" name="email" value={email} />

            <div className="field">
              <label htmlFor="token" className="field-label">
                Código de acceso
              </label>
              <OtpInput
                id="token"
                name="token"
                length={CODE_LENGTH}
                value={code}
                onValueChange={setCode}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={verifyPending || missing > 0}
              className="btn-auth"
            >
              {verifyPending
                ? "Comprobando…"
                : missing === 0
                  ? "Entrar"
                  : missing === 1
                    ? "Falta 1 dígito"
                    : `Faltan ${missing} dígitos`}
            </button>

            <button
              type="button"
              onClick={() => {
                setCode("");
                setStep("email");
              }}
              className="btn-auth-ghost"
            >
              Usar otro correo
            </button>

            {verifyState.status === "error" && (
              <p className="auth-note" data-tone="error" role="alert">
                <span className="auth-note-dot" aria-hidden />
                {verifyState.message}
              </p>
            )}
          </form>
        </>
      ) : (
        <>
          <p className="kicker">Paso 1 de 2</p>
          <p className="auth-lede">
            Inicia sesión con un código de un solo uso enviado a tu correo.
          </p>

          <form action={handleSend} className="auth-form">
            <div className="field">
              <label htmlFor="email" className="field-label">
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
                className="field-control"
              />
            </div>

            <button type="submit" disabled={sendPending} className="btn-auth">
              {sendPending ? "Enviando…" : "Enviar código de acceso"}
            </button>

            {sendState.status === "error" && (
              <p className="auth-note" data-tone="error" role="alert">
                <span className="auth-note-dot" aria-hidden />
                {sendState.message}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
