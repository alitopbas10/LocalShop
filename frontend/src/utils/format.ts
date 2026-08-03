const currencyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const dateFormatter = new Intl.DateTimeFormat("tr-TR");

export function formatPrice(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}
