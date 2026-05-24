import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { ClassDetailView } from "@/features/class-calendar/components/ClassDetailView";
import { classCalendarRepository } from "@/features/class-calendar/repositories/classCalendarRepository";
import { mockRepository } from "@/mocks/mockRepository";
import type { Class } from "@/types/class";

export default async function ClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const classItem = mockRepository.getClassById(classId) ?? ({
    id: classId,
    teacherId: "teacher-1",
    name: "반 상세",
    description: "",
    status: "active",
    studentCount: 0,
    createdAt: new Date().toISOString()
  } satisfies Class);
  const students = mockRepository.getStudentsByClassId(classId);

  return (
    <TeacherLayout title={classItem.name}>
      <ClassDetailView
        classItem={classItem}
        students={students}
        initialCalendarState={classCalendarRepository.getInitialState()}
      />
    </TeacherLayout>
  );
}
