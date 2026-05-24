import { redirect } from "next/navigation";

import { getCurrentUser, getDestinationForRole } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  redirect(user ? getDestinationForRole(user.role) : "/login");
}
