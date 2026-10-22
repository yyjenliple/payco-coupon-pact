import { DomainError } from "@/lib/errors";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Turns a DomainError into a user-facing error result; anything else is a real failure. */
export async function asResult<T extends object>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await run()) };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.message };
    throw error;
  }
}
