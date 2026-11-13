export type HealthResponse = { status: "ok"; db: "up" | "down"; timestamp: string };
export type ApiErrorResponse = { message: string };
