// Amounts are integers in minor units (fils, halalas, cents).
// Decimals come from Intl, so KWD gets 3 and AED gets 2 without a table to maintain.

export function minorDigits(currency) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
}

export function toMinor(amount, currency) {
  // toPrecision(12) so that 1.005 * 100 (100.49999…) still rounds to 101
  const scaled = Number((Math.abs(amount) * 10 ** minorDigits(currency)).toPrecision(12));
  return Math.sign(amount) * Math.round(scaled);
}

export function fromMinor(minor, currency) {
  return minor / 10 ** minorDigits(currency);
}

// digits: "latn" for 0-9, "arab" for ٠-٩, or leave it to the locale
export function formatMoney(minor, { currency, locale = "ar", digits } = {}) {
  const tag = digits ? `${locale}-u-nu-${digits}` : locale;
  return new Intl.NumberFormat(tag, { style: "currency", currency }).format(fromMinor(minor, currency));
}
