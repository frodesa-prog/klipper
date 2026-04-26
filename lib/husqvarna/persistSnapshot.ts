import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { mowerSnapshots } from "@/lib/db/schema";
import type { HusqvarnaMower } from "./types";

export async function persistSnapshot(mower: HusqvarnaMower) {
  const { system, battery, mower: mowerState, positions, statistics } = mower.attributes;
  const pos = positions?.[0] ?? null;

  await db.insert(mowerSnapshots).values({
    mowerId: mower.id,
    mowerName: system.name,
    state: mowerState.state,
    activity: mowerState.activity,
    batteryPercent: battery.batteryPercent,
    latitude: pos?.latitude ?? null,
    longitude: pos?.longitude ?? null,
    position: (pos
      ? sql`ST_SetSRID(ST_MakePoint(${pos.longitude}, ${pos.latitude}), 4326)`
      : null) as unknown as string,
    errorCode: mowerState.errorCode ?? null,
    mode: mowerState.mode,
    cuttingBladeUsageTime: statistics?.cuttingBladeUsageTime ?? null,
    numberOfCollisions: statistics?.numberOfCollisions ?? null,
    numberOfChargingCycles: statistics?.numberOfChargingCycles ?? null,
    totalCuttingTime: statistics?.totalCuttingTime ?? null,
    totalChargingTime: statistics?.totalChargingTime ?? null,
    totalRunningTime: statistics?.totalRunningTime ?? null,
    totalDrivenDistance: statistics?.totalDrivenDistance ?? null,
  });
}
