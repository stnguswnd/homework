import { redirect } from "next/navigation";

import { getCurrentUser, getDestinationForRole } from "@/lib/auth/session";
import { getStudentSession } from "@/server/auth/studentSession";

export default async function HomePage() {
  const [user, studentSession] = await Promise.all([getCurrentUser(), getStudentSession()]);

  if (user) {
    redirect(getDestinationForRole(user.role));
  }

  if (studentSession) {
    redirect("/student/home");
  }

  redirect("/login");
}
