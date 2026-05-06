"use client";

import { useRouter } from "next/navigation";
import { IconLogout } from "@/components/ui/icons";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="iconWithText ghost" onClick={logout} title="Logout" aria-label="Logout">
      <IconLogout width={15} height={15} />
      <span>Logout</span>
    </button>
  );
}
