/**
 * Shared formatting utilities for BizFlow.
 * All money values must flow through formatMoney() so the correct
 * currency symbol is displayed for every business.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: "UGX",
  KES: "KES",
  TZS: "TZS",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Format a numeric value as a currency string.
 * @param value  The numeric amount (e.g. 850000)
 * @param currency  ISO 4217 code from business.currency (e.g. "UGX")
 */
export function formatMoney(value: number | null | undefined, currency = "UGX"): string {
  const amount = Number(value ?? 0);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString("en-UG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * React hook — returns a pre-bound formatMoney for the current business currency.
 * Usage: const money = useMoney();  then  money(850000)
 */
import { useBusiness } from "../context/AuthContext";

export function useMoney(): (value: number | null | undefined) => string {
  const { business } = useBusiness();
  const currency = business?.currency ?? "UGX";
  return (value) => formatMoney(value, currency);
}

/**
 * Format a date string into a short human-readable form.
 * Uses the local timezone of the browser (correct for East Africa).
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return today's date as YYYY-MM-DD in the LOCAL timezone (not UTC).
 * Fixes the UTC-vs-EAT bug where new Date().toISOString() returns yesterday
 * in the evening for UTC+3 users.
 */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Return the first day of the current month as YYYY-MM-DD in local timezone.
 */
export function localMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
