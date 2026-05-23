import { notFound } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { ClassDetailView } from "@/features/class-calendar/components/ClassDetailView";
import { classCalendarRepository } from "@/features/class-calendar/repositories/classCalendarRepository";
import { mockRepository } from "@/mocks/mockRepository";

export default async function ClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const classItem = mockRepository.getClassById(classId);
  if (!classItem) notFound();
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
