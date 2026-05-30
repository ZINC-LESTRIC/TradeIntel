// Currency helpers - respect each record's currency
const SYMBOLS = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ", PKR: "₨", CNY: "¥", AUD: "A$", CAD: "C$" };

export const currencySymbol = (code) => SYMBOLS[code] || (code || "$");

export const fmtMoney = (value, currency = "USD", maxFraction = 0) => {
  const num = Number(value) || 0;
  const sym = currencySymbol(currency);
  return `${sym}${new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFraction }).format(num)}`;
};

export const fmtPrice = (value, currency = "USD") => fmtMoney(value, currency, 2);

export const fmtNum = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
