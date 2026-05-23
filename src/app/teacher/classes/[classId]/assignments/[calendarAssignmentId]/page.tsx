import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { ClassAssignmentDetailClient } from "./ClassAssignmentDetailClient";
import { classCalendarRepository } from "@/features/class-calendar/repositories/classCalendarRepository";
import { mockRepository } from "@/mocks/mockRepository";

export default async function ClassAssignmentDetailPage({
  params
}: {
  params: Promise<{ classId: string; calendarAssignmentId: string }>;
}) {
  const { classId, calendarAssignmentId } = await params;
  const classItem = mockRepository.getClassById(classId);
  const students = mockRepository.getStudentsByClassId(classId);

  return (
    <TeacherLayout title={classItem?.name ?? "숙제 상세"}>
      <ClassAssignmentDetailClient
        classId={classId}
        assignmentId={calendarAssignmentId}
        students={students}
        initialState={classCalendarRepository.getInitialState()}
      />
    </TeacherLayout>
  );
}
