"use client";

import { useRef, useState } from "react";

/**
 * Entrada de código OTP con una casilla por dígito.
 *
 * Por debajo es UN solo <input> real (transparente, superpuesto a las casillas):
 * así el autorelleno del navegador, el pegado y la selección nativa siguen
 * funcionando, cosa que se pierde al usar N inputs independientes. Las casillas
 * son decorativas y se pintan a partir del valor.
 */
export function OtpInput({
  id,
  name,
  length,
  value,
  onValueChange,
  autoFocus,
  groupSize = 4,
}: {
  id: string;
  name: string;
  length: number;
  value: string;
  onValueChange: (value: string) => void;
  autoFocus?: boolean;
  /** Separación visual cada N casillas (como en los códigos impresos). */
  groupSize?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length }, (_, i) => i);

  // El cursor siempre al final: el indicador de casilla activa asume que se
  // escribe de izquierda a derecha sin huecos.
  function caretToEnd(input: HTMLInputElement) {
    const end = input.value.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) {
      input.setSelectionRange(end, end);
    }
  }

  return (
    <div
      className="otp-field"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        required
        maxLength={length}
        className="otp-input"
        value={value}
        onChange={(event) =>
          onValueChange(event.target.value.replace(/\D/g, "").slice(0, length))
        }
        onFocus={(event) => {
          setFocused(true);
          caretToEnd(event.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(event) => caretToEnd(event.currentTarget)}
      />

      {cells.map((index) => (
        <span
          key={index}
          className="otp-cell"
          data-filled={index < value.length}
          data-active={focused && index === Math.min(value.length, length - 1)}
          data-group-start={index > 0 && index % groupSize === 0}
          aria-hidden
        >
          {value[index] ?? ""}
        </span>
      ))}
    </div>
  );
}
