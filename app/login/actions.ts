"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SendCodeState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function sendCode(
  _prevState: SendCodeState,
  formData: FormData,
): Promise<SendCodeState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { status: "error", message: "Introduce un correo electrónico." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    console.error("Error al enviar el código de acceso:", error.message);
    return {
      status: "error",
      message: "No se ha podido enviar el código. Inténtalo de nuevo.",
    };
  }

  return {
    status: "success",
    message: `Te hemos enviado un código de acceso a ${email}.`,
  };
}

export type VerifyCodeState = {
  status: "idle" | "error";
  message: string;
};

export async function verifyCode(
  _prevState: VerifyCodeState,
  formData: FormData,
): Promise<VerifyCodeState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();

  if (!email || !token) {
    return {
      status: "error",
      message: "Introduce el código que te hemos enviado.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    console.error("Error al verificar el código:", error.message);
    return {
      status: "error",
      message: "Código incorrecto o caducado. Pide uno nuevo.",
    };
  }

  redirect("/");
}
