"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { USER_COOKIE } from "@/lib/users";

export async function switchUser(id: string) {
  (await cookies()).set(USER_COOKIE, id, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}
