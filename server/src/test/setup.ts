process.env.PORT ??= "8080";
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/my_pern_app";
process.env.JWT_SECRET ??= "test-secret";
process.env.JWT_EXPIRES_IN ??= "15m";
process.env.SESSION_SECRET ??= "test-secret";

const appModule = await import("../app");

export const app = appModule.app;
