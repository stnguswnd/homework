import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { StudentManagementView } from "@/features/student-management/components/StudentManagementView";
import { studentRepository } from "@/features/student-management/repositories/studentRepository";

export default async function StudentsPage() {
  const students = await studentRepository.getStudents();

  return (
    <TeacherLayout title="학생관리">
      <StudentManagementView initialStudents={students} />
    </TeacherLayout>
  );
}
