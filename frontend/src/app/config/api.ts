/**
 * Central API configuration.
 * Set NEXT_PUBLIC_API_URL in your .env.local to override for production.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const WS_BASE = API_BASE.replace(/^http/, "ws");
