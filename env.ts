import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    HUSQVARNA_CLIENT_ID: z.string().min(1),
    HUSQVARNA_CLIENT_SECRET: z.string().min(1),
    POLL_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_MAPTILER_API_KEY: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    HUSQVARNA_CLIENT_ID: process.env.HUSQVARNA_CLIENT_ID,
    HUSQVARNA_CLIENT_SECRET: process.env.HUSQVARNA_CLIENT_SECRET,
    POLL_SECRET: process.env.POLL_SECRET,
    NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY,
  },
});
