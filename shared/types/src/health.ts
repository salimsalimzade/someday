export interface HealthStatus {
  status: "ok";
  /** Seconds since the server started. */
  uptime: number;
  /** ISO 8601 timestamp of the check. */
  timestamp: string;
}
