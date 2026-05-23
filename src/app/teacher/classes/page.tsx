import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { mockRepository } from "@/mocks/mockRepository";

export default function ClassesPage() {
  return (
    <TeacherLayout title="반 목록">
      <div className="mb-4 flex justify-end"><Button>반 만들기</Button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockRepository.getClasses().map((classItem) => (
          <Card key={classItem.id}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{classItem.name}</h2>
              <Badge tone={classItem.status === "active" ? "green" : "gray"}>{classItem.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{classItem.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">학생</dt><dd className="font-bold">{classItem.studentCount}명</dd></div>
              <div><dt className="text-slate-500">진행 숙제</dt><dd className="font-bold">{classItem.activeAssignmentCount}개</dd></div>
            </dl>
            <Button href={`/teacher/classes/${classItem.id}`} className="mt-4 w-full" variant="secondary">상세 보기</Button>
          </Card>
        ))}
      </div>
    </TeacherLayout>
  );
}
