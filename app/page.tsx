import { Workspace } from "@/components/workspace";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const state = await readState();
  return <Workspace initialState={state} />;
}
