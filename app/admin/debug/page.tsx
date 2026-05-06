import { AdminDebugWorkbench } from "@/components/admin-debug-workbench";
import { isAdminDebugAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminDebugPage() {
  const authenticated = await isAdminDebugAuthenticated();
  return <AdminDebugWorkbench authenticated={authenticated} />;
}
