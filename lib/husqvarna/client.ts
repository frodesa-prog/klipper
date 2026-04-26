import { env } from "@/env";
import type { HusqvarnaMower, HusqvarnaApiResponse, TokenResponse } from "./types";

const AUTH_URL = "https://api.authentication.husqvarnagroup.dev/v1/oauth2/token";
const API_BASE = "https://api.amc.husqvarna.dev/v1";

// Module-level token cache — survives across requests in the same lambda warm instance
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.HUSQVARNA_CLIENT_ID,
      client_secret: env.HUSQVARNA_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Husqvarna auth failed: ${res.status} ${await res.text()}`);
  }

  const data: TokenResponse = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

async function husqvarnaFetch<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Authorization-Provider": "husqvarna",
      "X-Api-Key": env.HUSQVARNA_CLIENT_ID,
      "Content-Type": "application/vnd.api+json",
    },
  });

  if (!res.ok) {
    throw new Error(`Husqvarna API error ${res.status} on ${path}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export async function listMowers(): Promise<HusqvarnaMower[]> {
  const data = await husqvarnaFetch<HusqvarnaApiResponse>("/mowers");
  return Array.isArray(data.data) ? data.data : [data.data];
}

export async function getMowerStatus(mowerId: string): Promise<HusqvarnaMower> {
  const data = await husqvarnaFetch<HusqvarnaApiResponse>(`/mowers/${mowerId}`);
  return Array.isArray(data.data) ? data.data[0] : data.data;
}
