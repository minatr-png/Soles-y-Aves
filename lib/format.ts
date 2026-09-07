// Formato es-ES para importes en céntimos. `useGrouping:true` es obligatorio:
// por defecto Intl no agrupa separadores de miles en cifras de 4 dígitos.

const centEuros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

// Cifras con dos decimales, p. ej. "1.257,00 €". Ignora el signo.
export function money(cents: number): string {
  return centEuros.format(Math.abs(cents) / 100);
}

// Alias de `money`, mantenido para los usos existentes de dos decimales.
export function money2(cents: number): string {
  return money(cents);
}

// Con el signo natural de Intl (p. ej. "-497,00 €"), sin forzar "+" en
// positivos. Usada para el saldo de una cuenta, que puede ser negativo.
export function moneyBalance(cents: number): string {
  return centEuros.format(cents / 100);
}

// Con signo: "+" para positivos (y cero), menos tipográfico "−" para negativos.
export function signed(cents: number, decimals: 0 | 2 = 0): string {
  const sign = cents < 0 ? "−" : "+";
  const amount = decimals === 2 ? money2(cents) : money(cents);
  return `${sign}${amount}`;
}
