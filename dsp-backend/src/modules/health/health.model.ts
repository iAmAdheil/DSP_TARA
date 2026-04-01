export interface HealthModel {
  status: "ok" | "degraded";
  db: "connected" | "disconnected";
}
