import { DomainError } from "@/lib/errors";

/**
 * Server action arguments come from the client and can be anything.
 * Postgres would happily cast "7" to 7, so ids are checked before they reach a query.
 */
export function toId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new DomainError("INVALID", "잘못된 요청이에요");
  }
  return value;
}

export function toText(value: unknown): string {
  if (typeof value !== "string") throw new DomainError("INVALID", "잘못된 요청이에요");
  return value;
}
