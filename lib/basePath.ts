/**
 * Must match `basePath` in next.config.ts.
 * Used in client-side fetch() calls so requests go to the correct path
 * when the app is mounted at a subpath (e.g. sirkussand.com/klipper).
 */
export const BASE_PATH = "/klipper";
