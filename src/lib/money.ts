/** "$480", "$44.00" → "$44", null → "Price on consultation". Shared by server and client. */
export function money(cents: number | null | undefined, opts: { from?: boolean; perMonth?: boolean } = {}) {
  if (cents == null) return "Price on consultation";
  const dollars = cents / 100;
  const s = dollars % 1 === 0 ? `$${dollars.toLocaleString("en-US")}` : `$${dollars.toFixed(2)}`;
  return `${opts.from ? "From " : ""}${s}${opts.perMonth ? "/mo" : ""}`;
}
