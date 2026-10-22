export type DomainErrorCode = "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "CONFLICT";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
