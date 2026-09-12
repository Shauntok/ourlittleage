import { redirect } from "next/navigation";

import SecurityCenterClient from "@/components/admin/security/SecurityCenterClient";
import {
  canViewSecurityCenter,
  getAdminActor,
} from "@/lib/admin/authorization";

export const dynamic = "force-dynamic";

export default async function SecurityCenterPage() {
  const actor = await getAdminActor();

  if (!actor) redirect("/");
  if (!canViewSecurityCenter(actor.role)) redirect("/admin/homepage");

  return <SecurityCenterClient currentRole={actor.role} />;
}
