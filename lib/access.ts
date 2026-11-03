// The access rule from Session 2. past_due keeps access: a business choice for 10 Minute School.
export const ACCESS_STATUSES = ["active", "trialing", "past_due"] as const;

export const hasAccess = (s?: string | null) =>
  !!s && (ACCESS_STATUSES as readonly string[]).includes(s);

export type StatusGroup = "good" | "problem" | "ended";

export const statusGroup = (s: string): StatusGroup =>
  ["active", "trialing"].includes(s) ? "good"
  : ["past_due", "incomplete", "paused"].includes(s) ? "problem"
  : "ended"; // unpaid, canceled, incomplete_expired
