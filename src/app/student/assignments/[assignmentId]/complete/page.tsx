import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function CompletePage() {
  const submittedAt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
  return (
    <StudentLayout title="제출 완료">
      <Card className="text-center">
        <p className="text-5xl">✓</p>
        <h1 className="mt-4 text-2xl font-bold">제출 완료</h1>
        <p className="mt-2 text-slate-600">선생님이 녹음을 확인한 뒤 피드백을 남길 예정입니다.</p>
        <p className="mt-4 rounded-md bg-paper p-3 text-sm">제출 시간: {submittedAt}</p>
        <div className="mt-6">
          <Button href="/student/home" variant="secondary" className="min-h-12 w-full">숙제 목록으로</Button>
        </div>
      </Card>
    </StudentLayout>
  );
}
