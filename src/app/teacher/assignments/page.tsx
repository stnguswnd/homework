"use client";

import { useMemo, useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDateTime, formatDue } from "@/lib/format";

type ViewMode = "assignment" | "homework";
type PageMode = "list" | "detail";
type HomeworkStatus = "published" | "draft";
type SubmissionStatus = "submitted" | "not_submitted" | "late";
type FeedbackStatus = "needed" | "done" | "none";

type ClassRow = { id: string; name: string; description: string };
type Homework = { id: string; title: string; description: string; type: string; status: HomeworkStatus };
type Assignment = {
  id: string;
  homeworkId: string;
  classId: string;
  assignedAt: string;
  dueAt: string;
  status: HomeworkStatus;
  targetStudentCount: number;
  submittedCount: number;
  unsubmittedCount: number;
  feedbackNeededCount: number;
  feedbackDoneCount: number;
};
type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  hasAudio: boolean;
  feedbackStatus: FeedbackStatus;
};

const classes: ClassRow[] = [
  { id: "class_1", name: "월수 Basic Speaking", description: "초등 4-5학년 말하기 기초반" },
  { id: "class_2", name: "화목 Basic Speaking", description: "초등 4-5학년 말하기 기초반" },
  { id: "class_3", name: "초등 Reading A", description: "초등 리딩 A반" },
  { id: "class_4", name: "초등 Reading B", description: "초등 리딩 B반" },
  { id: "class_5", name: "화목 Reading Plus", description: "리딩 플러스 심화반" }
];

const homeworks: Homework[] = [
  { id: "hw_1", title: "Discovery Unit 1 Speaking Homework", description: "원어민 음성을 듣고 같은 속도로 읽어 보세요.", type: "듣기/녹음", status: "published" },
  { id: "hw_2", title: "Reading Plus Shadowing 03", description: "문장을 듣고 자연스럽게 따라 읽습니다.", type: "문장 따라 읽기", status: "published" },
  { id: "hw_3", title: "Picture Talk Practice", description: "이미지를 보고 보이는 내용을 영어로 설명합니다.", type: "이미지 보고 말하기", status: "draft" }
];

const assignments: Assignment[] = [
  { id: "as_1", homeworkId: "hw_1", classId: "class_1", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-25T23:59:00", status: "published", targetStudentCount: 8, submittedCount: 2, unsubmittedCount: 6, feedbackNeededCount: 2, feedbackDoneCount: 0 },
  { id: "as_2", homeworkId: "hw_1", classId: "class_2", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-26T23:59:00", status: "published", targetStudentCount: 6, submittedCount: 0, unsubmittedCount: 6, feedbackNeededCount: 0, feedbackDoneCount: 0 },
  { id: "as_3", homeworkId: "hw_1", classId: "class_3", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-27T22:00:00", status: "published", targetStudentCount: 10, submittedCount: 5, unsubmittedCount: 5, feedbackNeededCount: 3, feedbackDoneCount: 2 },
  { id: "as_4", homeworkId: "hw_2", classId: "class_5", assignedAt: "2026-05-24T09:00:00", dueAt: "2026-05-28T23:59:00", status: "published", targetStudentCount: 7, submittedCount: 0, unsubmittedCount: 7, feedbackNeededCount: 0, feedbackDoneCount: 0 },
  { id: "as_5", homeworkId: "hw_3", classId: "class_4", assignedAt: "2026-05-24T09:00:00", dueAt: "2026-05-30T21:00:00", status: "draft", targetStudentCount: 9, submittedCount: 0, unsubmittedCount: 9, feedbackNeededCount: 0, feedbackDoneCount: 0 }
];

const submissions: Submission[] = [
  { id: "sub_1", assignmentId: "as_1", studentId: "stu_1", studentName: "이지우", status: "submitted", submittedAt: "2026-05-25T20:10:00", hasAudio: true, feedbackStatus: "needed" },
  { id: "sub_2", assignmentId: "as_1", studentId: "stu_2", studentName: "박서준", status: "not_submitted", submittedAt: null, hasAudio: false, feedbackStatus: "none" },
  { id: "sub_3", assignmentId: "as_1", studentId: "stu_3", studentName: "최하윤", status: "submitted", submittedAt: "2026-05-25T21:30:00", hasAudio: true, feedbackStatus: "done" },
  { id: "sub_4", assignmentId: "as_3", studentId: "stu_4", studentName: "정도윤", status: "late", submittedAt: "2026-05-28T01:12:00", hasAudio: true, feedbackStatus: "needed" },
  { id: "sub_5", assignmentId: "as_3", studentId: "stu_5", studentName: "한아린", status: "submitted", submittedAt: "2026-05-27T20:40:00", hasAudio: true, feedbackStatus: "done" }
];

const classFilterOptions = ["전체 반", ...classes.map((classItem) => classItem.name)];
const statusFilterOptions = ["전체", "published", "draft", "마감 임박", "마감 지남", "미제출 있음"];
const sortOptions = ["최신순", "마감 임박순", "제출률 낮은 순", "제출률 높은 순"];

function progressPercent(assignment: Assignment) {
  return assignment.targetStudentCount === 0 ? 0 : Math.round((assignment.submittedCount / assignment.targetStudentCount) * 100);
}

function statusTone(status: HomeworkStatus) {
  return status === "published" ? "green" : "gray";
}

function submissionLabel(status: SubmissionStatus) {
  if (status === "submitted") return "제출 완료";
  if (status === "late") return "지각 제출";
  return "미제출";
}

function submissionTone(status: SubmissionStatus) {
  if (status === "submitted") return "green";
  if (status === "late") return "yellow";
  return "red";
}

function feedbackLabel(status: FeedbackStatus) {
  if (status === "needed") return "피드백 필요";
  if (status === "done") return "피드백 완료";
  return "미작성";
}

function feedbackTone(status: FeedbackStatus) {
  if (status === "needed") return "yellow";
  if (status === "done") return "green";
  return "gray";
}

function isDueSoon(dueAt: string) {
  const now = new Date("2026-05-24T00:00:00");
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= 3 * 24 * 60 * 60 * 1000;
}

function isPastDue(dueAt: string) {
  return new Date(dueAt).getTime() < new Date("2026-05-24T00:00:00").getTime();
}

export default function AssignmentsPage() {
  const [pageMode, setPageMode] = useState<PageMode>("list");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("as_1");
  const [viewMode, setViewMode] = useState<ViewMode>("assignment");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("전체 반");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [sort, setSort] = useState("최신순");

  const assignmentRows = useMemo(() => {
    const rows = assignments
      .map((assignment) => ({
        assignment,
        homework: homeworks.find((homework) => homework.id === assignment.homeworkId),
        classItem: classes.find((classItem) => classItem.id === assignment.classId)
      }))
      .filter((row): row is { assignment: Assignment; homework: Homework; classItem: ClassRow } => Boolean(row.homework && row.classItem));
    return rows
      .filter(({ assignment, homework, classItem }) => {
        const matchesQuery = !query.trim() || homework.title.toLowerCase().includes(query.trim().toLowerCase());
        const matchesClass = classFilter === "전체 반" || classItem.name === classFilter;
        const matchesStatus =
          statusFilter === "전체" ||
          assignment.status === statusFilter ||
          (statusFilter === "마감 임박" && isDueSoon(assignment.dueAt)) ||
          (statusFilter === "마감 지남" && isPastDue(assignment.dueAt)) ||
          (statusFilter === "미제출 있음" && assignment.unsubmittedCount > 0);
        return matchesQuery && matchesClass && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "마감 임박순") return new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime();
        if (sort === "제출률 낮은 순") return progressPercent(a.assignment) - progressPercent(b.assignment);
        if (sort === "제출률 높은 순") return progressPercent(b.assignment) - progressPercent(a.assignment);
        return new Date(b.assignment.assignedAt).getTime() - new Date(a.assignment.assignedAt).getTime();
      });
  }, [classFilter, query, sort, statusFilter]);

  const homeworkRows = useMemo(() => {
    return homeworks
      .map((homework) => {
        const related = assignmentRows.filter((row) => row.homework.id === homework.id);
        return {
          homework,
          rows: related,
          targetCount: related.reduce((sum, row) => sum + row.assignment.targetStudentCount, 0),
          submittedCount: related.reduce((sum, row) => sum + row.assignment.submittedCount, 0),
          unsubmittedCount: related.reduce((sum, row) => sum + row.assignment.unsubmittedCount, 0)
        };
      })
      .filter((row) => row.rows.length > 0);
  }, [assignmentRows]);

  function openDetail(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    setPageMode("detail");
  }

  if (pageMode === "detail") {
    return (
      <TeacherLayout title="제출 관리">
        <AssignmentSubmissionDetail assignmentId={selectedAssignmentId} onBack={() => setPageMode("list")} />
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="숙제 목록">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-md border border-line bg-white p-1">
          <button className={`rounded px-4 py-2 text-sm font-bold ${viewMode === "assignment" ? "bg-action text-white" : "text-slate-600"}`} onClick={() => setViewMode("assignment")}>배정별 보기</button>
          <button className={`rounded px-4 py-2 text-sm font-bold ${viewMode === "homework" ? "bg-action text-white" : "text-slate-600"}`} onClick={() => setViewMode("homework")}>숙제별 보기</button>
        </div>
        <Button href="/teacher/assignments/new">숙제 만들기</Button>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-semibold">숙제 검색<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="숙제명 검색" /></label>
          <label className="grid gap-2 text-sm font-semibold">반 필터<Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>{classFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">상태 필터<Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statusFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">정렬<Select value={sort} onChange={(event) => setSort(event.target.value)}>{sortOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
        </div>
      </Card>

      {viewMode === "assignment" ? (
        <div className="grid gap-4">
          {assignmentRows.map((row) => <AssignmentCard key={row.assignment.id} {...row} onOpenDetail={openDetail} />)}
        </div>
      ) : (
        <div className="grid gap-4">
          {homeworkRows.map((row) => <HomeworkCard key={row.homework.id} {...row} onOpenDetail={openDetail} />)}
        </div>
      )}
    </TeacherLayout>
  );
}

function AssignmentCard({ assignment, homework, classItem, onOpenDetail }: { assignment: Assignment; homework: Homework; classItem: ClassRow; onOpenDetail: (assignmentId: string) => void }) {
  const progress = progressPercent(assignment);
  return (
    <Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-sm font-bold text-action">{classItem.name}</p>
          <h2 className="mt-1 text-lg font-bold">{homework.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{homework.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{homework.type}</Badge>
            <Badge tone="yellow">마감: {formatDue(assignment.dueAt)}</Badge>
            <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <p>대상 {assignment.targetStudentCount}명 · 제출 {assignment.submittedCount}명 · 미제출 {assignment.unsubmittedCount}명</p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-action" style={{ width: `${progress}%` }} /></div>
            <p className="font-semibold text-slate-600">진행률 {progress}%</p>
          </div>
        </div>
        <div className="grid gap-2 sm:flex xl:grid xl:min-w-36">
          <Button type="button" variant="secondary" onClick={() => window.alert("숙제 내용과 배정 정보 상세 목업입니다.")}>상세</Button>
          <Button type="button" variant="secondary" onClick={() => window.alert("이 반의 마감일, 공개 상태, 대상 학생 수정 목업입니다.")}>배정 수정</Button>
          {assignment.status === "draft" ? (
            <Button type="button" disabled>게시 후 확인 가능</Button>
          ) : (
            <Button type="button" onClick={() => onOpenDetail(assignment.id)}>제출 현황</Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function HomeworkCard({ homework, rows, targetCount, submittedCount, unsubmittedCount, onOpenDetail }: { homework: Homework; rows: Array<{ assignment: Assignment; homework: Homework; classItem: ClassRow }>; targetCount: number; submittedCount: number; unsubmittedCount: number; onOpenDetail: (assignmentId: string) => void }) {
  return (
    <Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{homework.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{homework.description}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Badge>{homework.type}</Badge><Badge tone={statusTone(homework.status)}>{homework.status}</Badge></div>
          <p className="mt-4 text-sm font-semibold">배정 {rows.length}개 · 대상 {targetCount}명 · 제출 {submittedCount}명 · 미제출 {unsubmittedCount}명</p>
          <div className="mt-4 rounded-md border border-line">
            <div className="border-b border-line bg-slate-50 px-3 py-2 text-sm font-bold">반별 요약</div>
            {rows.map(({ assignment, classItem }) => {
              const progress = progressPercent(assignment);
              return (
                <div key={assignment.id} className="grid gap-2 border-b border-line px-3 py-3 text-sm last:border-b-0 lg:grid-cols-[1fr_190px_110px_90px_auto] lg:items-center">
                  <span className="font-semibold">{classItem.name}</span>
                  <span>마감 {formatDue(assignment.dueAt)}</span>
                  <span>제출 {assignment.submittedCount}/{assignment.targetStudentCount}명</span>
                  <span>{progress}%</span>
                  <Button type="button" variant="secondary" onClick={() => onOpenDetail(assignment.id)} disabled={assignment.status === "draft"}>{assignment.status === "draft" ? "게시 후 확인" : "현황 보기"}</Button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-32 xl:grid-cols-1">
          <Button type="button" variant="secondary" onClick={() => window.alert("숙제 템플릿 상세 목업입니다.")}>상세</Button>
          <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">내용 수정</Button>
          <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">다시 배정</Button>
        </div>
      </div>
    </Card>
  );
}

function AssignmentSubmissionDetail({ assignmentId, onBack }: { assignmentId: string; onBack: () => void }) {
  const assignment = assignments.find((item) => item.id === assignmentId) ?? assignments[0];
  const homework = homeworks.find((item) => item.id === assignment.homeworkId) ?? homeworks[0];
  const classItem = classes.find((item) => item.id === assignment.classId) ?? classes[0];
  const [studentQuery, setStudentQuery] = useState("");
  const [submitFilter, setSubmitFilter] = useState("전체");
  const [feedbackFilter, setFeedbackFilter] = useState("전체");
  const rows = submissions.filter((submission) => submission.assignmentId === assignment.id);
  const paddedRows: Submission[] = rows.length >= assignment.targetStudentCount ? rows : [
    ...rows,
    ...Array.from({ length: assignment.targetStudentCount - rows.length }, (_, index) => ({
      id: `${assignment.id}-mock-${index}`,
      assignmentId: assignment.id,
      studentId: `mock-${index}`,
      studentName: ["김민준", "이서연", "박지훈", "최유진", "정하윤", "오지후", "한아린", "유재영"][index % 8],
      status: "not_submitted" as const,
      submittedAt: null,
      hasAudio: false,
      feedbackStatus: "none" as const
    }))
  ];
  const filteredRows = paddedRows.filter((row) => {
    const matchesName = !studentQuery.trim() || row.studentName.includes(studentQuery.trim());
    const matchesSubmit = submitFilter === "전체" || submissionLabel(row.status) === submitFilter;
    const matchesFeedback = feedbackFilter === "전체" || feedbackLabel(row.feedbackStatus) === feedbackFilter;
    return matchesName && matchesSubmit && matchesFeedback;
  });
  const lateCount = paddedRows.filter((row) => row.status === "late").length;

  return (
    <div className="grid gap-4">
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-xl font-bold">{homework.title}</h2>
            <p className="mt-2 text-slate-600">{homework.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">반: {classItem.name}</Badge>
              <Badge>{homework.type}</Badge>
              <Badge tone={statusTone(assignment.status)}>{assignment.status === "published" ? "게시됨" : "임시저장"}</Badge>
              <Badge>생성일: {assignment.assignedAt.slice(0, 10)}</Badge>
              <Badge tone="yellow">마감: {formatDue(assignment.dueAt)}</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:flex lg:grid">
            <Button type="button" variant="secondary" onClick={onBack}>반 목록으로</Button>
            <Button type="button" variant="secondary" onClick={() => window.alert("숙제 내용 수정 목업입니다.")}>숙제 수정하기</Button>
            <Button type="button" variant="secondary" onClick={() => window.alert("이 반 배정 수정 목업입니다.")}>배정 수정하기</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="대상 학생 수" value={assignment.targetStudentCount} />
        <Metric label="제출 완료 수" value={assignment.submittedCount} />
        <Metric label="미제출 수" value={assignment.unsubmittedCount} />
        <Metric label="지각 제출 수" value={lateCount} />
        <Metric label="피드백 필요 수" value={assignment.feedbackNeededCount} />
        <Metric label="피드백 완료 수" value={assignment.feedbackDoneCount} />
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">학생명 검색<Input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="학생명 검색" /></label>
          <label className="grid gap-2 text-sm font-semibold">제출 상태<Select value={submitFilter} onChange={(event) => setSubmitFilter(event.target.value)}><option>전체</option><option>제출 완료</option><option>미제출</option><option>지각 제출</option></Select></label>
          <label className="grid gap-2 text-sm font-semibold">피드백 상태<Select value={feedbackFilter} onChange={(event) => setFeedbackFilter(event.target.value)}><option>전체</option><option>피드백 필요</option><option>피드백 완료</option><option>미작성</option></Select></label>
        </div>
      </Card>

      <Card>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">학생명</th><th>제출 상태</th><th>제출 시간</th><th>제출 파일</th><th>피드백 상태</th><th>액션</th></tr></thead>
            <tbody>{filteredRows.map((row) => <SubmissionRow key={row.id} row={row} />)}</tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">
          {filteredRows.map((row) => <SubmissionMobileCard key={row.id} row={row} />)}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}명</p></Card>;
}

function SubmissionAction({ row }: { row: Submission }) {
  if (row.status === "not_submitted") return <Button type="button" variant="secondary" onClick={() => window.alert("알림 표시")}>알림 표시</Button>;
  if (row.feedbackStatus === "done") return <Button type="button" variant="secondary" onClick={() => window.alert("피드백 보기")}>피드백 보기</Button>;
  return <Button type="button" onClick={() => window.alert("피드백 작성")}>피드백 작성</Button>;
}

function SubmissionRow({ row }: { row: Submission }) {
  return (
    <tr className="border-t border-line">
      <td className="py-3 font-semibold">{row.studentName}</td>
      <td><Badge tone={submissionTone(row.status)}>{submissionLabel(row.status)}</Badge></td>
      <td>{row.submittedAt ? formatDateTime(row.submittedAt) : "-"}</td>
      <td>{row.hasAudio ? <Button type="button" variant="secondary" onClick={() => window.alert("오디오 재생")}>오디오 재생</Button> : "-"}</td>
      <td><Badge tone={feedbackTone(row.feedbackStatus)}>{feedbackLabel(row.feedbackStatus)}</Badge></td>
      <td><SubmissionAction row={row} /></td>
    </tr>
  );
}

function SubmissionMobileCard({ row }: { row: Submission }) {
  return (
    <div className="rounded-md border border-line p-3">
      <div className="flex items-start justify-between gap-3"><p className="font-bold">{row.studentName}</p><Badge tone={submissionTone(row.status)}>{submissionLabel(row.status)}</Badge></div>
      <p className="mt-2 text-sm text-slate-500">제출 시간: {row.submittedAt ? formatDateTime(row.submittedAt) : "-"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {row.hasAudio && <Button type="button" variant="secondary" onClick={() => window.alert("오디오 재생")}>오디오 재생</Button>}
        <Badge tone={feedbackTone(row.feedbackStatus)}>{feedbackLabel(row.feedbackStatus)}</Badge>
        <SubmissionAction row={row} />
      </div>
    </div>
  );
}
