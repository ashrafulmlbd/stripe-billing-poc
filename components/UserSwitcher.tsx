"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchUser } from "@/app/actions";

export function UserSwitcher({ users, current }: { users: { id: string; label: string }[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (users.length === 0) return <span className="text-sm text-bad">No users. Run npm run seed</span>;
  return (
    <label className="flex items-center gap-3">
      <span className="label">Logged in as</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => start(async () => { await switchUser(e.target.value); router.refresh(); })}
        className="rounded-lg border-2 border-line bg-panel px-3 py-1.5 font-semibold text-text"
      >
        {!users.some((u) => u.id === current) && <option value={current}>{current} (missing)</option>}
        {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </select>
    </label>
  );
}
