import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import type { Student } from "@/types/student";
import type { Submission } from "@/types/submission";

function submissionStatusLabel(status?: Submission["status"]) {
  switch (status) {
    case "reviewed":
      return "승인";
    case "returned":
      return "반려";
    case "submitted":
      return "제출 완료";
    default:
      return "미제출";
  }
}

function submissionStatusTone(status?: Submission["status"]) {
  if (status === "reviewed") return "green";
  if (status === "returned") return "red";
  if (status === "submitted") return "blue";
  return "gray";
}

function reviewStatusLabel(status?: Submission["status"]) {
  if (status === "reviewed") return "승인 완료";
  if (status === "returned") return "반려 완료";
  if (status === "submitted") return "검토 대기";
  return "-";
}

export function SubmissionOverviewTable({
  students,
  submissions
}: {
  students: Student[];
  submissions: Submission[];
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-2">학생명</th>
            <th>제출 상태</th>
            <th>검토 상태</th>
            <th>제출 시간</th>
            <th>피드백</th>
            <th>상세</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const submission = submissions.find((item) => item.studentId === student.id);
            return (
              <tr key={student.id} className="border-t border-line">
                <td className="py-3 font-semibold">{student.name}</td>
                <td>
                  <Badge tone={submissionStatusTone(submission?.status)}>
                    {submissionStatusLabel(submission?.status)}
                  </Badge>
                </td>
                <td>{reviewStatusLabel(submission?.status)}</td>
                <td>{formatDateTime(submission?.submittedAt)}</td>
                <td>{submission?.teacherComment ? "작성됨" : "없음"}</td>
                <td>
                  {submission ? (
                    <Button href={`/teacher/submissions/${submission.id}`} variant="secondary">
                      상세보기
                    </Button>
                  ) : (
                    <Button disabled variant="secondary">
                      상세보기
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
