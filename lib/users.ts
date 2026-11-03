import { cookies } from "next/headers";
import { getUser, listUsers, type User } from "./db";

export const USER_COOKIE = "demo_user";
export const DEFAULT_USER = "nusrat";

/** Labels for the header switcher. Clock users only exist while a simulation is running. */
export const USER_LABELS: Record<string, string> = {
  nusrat: "Nusrat (student)",
  school: "Dhanmondi Model Academy",
  clock_nusrat: "Nusrat · test clock",
  clock_tanvir: "Tanvir · test clock",
};

export async function currentUserId() {
  return (await cookies()).get(USER_COOKIE)?.value ?? DEFAULT_USER;
}

export async function currentUser(): Promise<User | undefined> {
  return getUser(await currentUserId());
}

export function switchableUsers() {
  return listUsers().map((u) => ({ id: u.id, label: USER_LABELS[u.id] ?? u.name }));
}
