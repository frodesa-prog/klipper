import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  customType,
} from "drizzle-orm/pg-core";

// PostGIS geometry(Point, 4326)
const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(Point, 4326)";
  },
});

// One row per poll – raw snapshot from the Husqvarna API
export const mowerSnapshots = pgTable("mower_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  mowerId: text("mower_id").notNull(),
  mowerName: text("mower_name"),
  state: text("state").notNull(),
  activity: text("activity").notNull(),
  batteryPercent: integer("battery_percent"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  position: geometry("position"),
  errorCode: integer("error_code"),
  mode: text("mode"),
  // Statistics from Husqvarna API (all cumulative counters)
  cuttingBladeUsageTime: integer("cutting_blade_usage_time"), // seconds
  numberOfCollisions: integer("number_of_collisions"),
  numberOfChargingCycles: integer("number_of_charging_cycles"),
  totalCuttingTime: integer("total_cutting_time"),            // seconds
  totalChargingTime: integer("total_charging_time"),          // seconds
  totalRunningTime: integer("total_running_time"),            // seconds
  totalDrivenDistance: integer("total_driven_distance"),      // meters
  polledAt: timestamp("polled_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MowerSnapshot = typeof mowerSnapshots.$inferSelect;
export type NewMowerSnapshot = typeof mowerSnapshots.$inferInsert;

// Manual maintenance events logged by the user
export const maintenanceEvents = pgTable("maintenance_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  mowerId: text("mower_id").notNull(),
  // BLADE_CHANGE | SERVICE | CLEANING | OTHER
  type: text("type").notNull(),
  notes: text("notes"),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MaintenanceEvent = typeof maintenanceEvents.$inferSelect;
export type NewMaintenanceEvent = typeof maintenanceEvents.$inferInsert;

// Map zones drawn by the user (lawn boundary, exclusions, landmarks)
export const zones = pgTable("zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // mowing_area | exclusion
  type: text("type").notNull(),
  // GeoJSON Polygon coordinates: [[[lng, lat], ...]]
  coordinates: jsonb("coordinates").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Zone = typeof zones.$inferSelect;
export type NewZone = typeof zones.$inferInsert;
