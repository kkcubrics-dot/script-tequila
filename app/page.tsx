import { Workspace } from "@/components/workspace";
import { getAuthedUser } from "@/lib/auth";
import { readState } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAuthedUser();
  if (!user) {
    redirect("/login");
  }
  const state = await readState();
  return <Workspace initialState={state} />;
}
