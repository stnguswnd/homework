"use client";

import { useMemo, useState } from "react";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDue } from "@/lib/format";

type HomeworkStatus = "published" | "draft";
type Subject = "Phonics" | "AL" | "AR";

type ClassRow = { id: string; name: string; description: string };
type Homework = { id: string; title: string; description: string; type: string; subject: Subject; status: HomeworkStatus };
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

const classes: ClassRow[] = [
  { id: "class_1", name: "월수 Basic Speaking", description: "초등 4-5학년 말하기 기초반" },
  { id: "class_2", name: "화목 Basic Speaking", description: "초등 4-5학년 말하기 기초반" },
  { id: "class_3", name: "초등 Reading A", description: "초등 리딩 A반" },
  { id: "class_4", name: "초등 Reading B", description: "초등 리딩 B반" },
  { id: "class_5", name: "화목 Reading Plus", description: "리딩 플러스 심화반" }
];

const homeworks: Homework[] = [
  { id: "hw_1", title: "Discovery Unit 1 Speaking Homework", description: "원어민 음성을 듣고 같은 속도로 읽어 보세요.", type: "듣기/녹음", subject: "AL", status: "published" },
  { id: "hw_2", title: "Reading Plus Shadowing 03", description: "문장을 듣고 자연스럽게 따라 읽습니다.", type: "문장 따라 읽기", subject: "AR", status: "published" },
  { id: "hw_3", title: "Picture Talk Practice", description: "이미지를 보고 보이는 내용을 영어로 설명합니다.", type: "이미지 보고 말하기", subject: "Phonics", status: "draft" }
];

const assignments: Assignment[] = [
  { id: "as_1", homeworkId: "hw_1", classId: "class_1", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-25T23:59:00", status: "published", targetStudentCount: 8, submittedCount: 2, unsubmittedCount: 6, feedbackNeededCount: 2, feedbackDoneCount: 0 },
  { id: "as_2", homeworkId: "hw_1", classId: "class_2", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-26T23:59:00", status: "published", targetStudentCount: 6, submittedCount: 0, unsubmittedCount: 6, feedbackNeededCount: 0, feedbackDoneCount: 0 },
  { id: "as_3", homeworkId: "hw_1", classId: "class_3", assignedAt: "2026-05-23T09:00:00", dueAt: "2026-05-27T22:00:00", status: "published", targetStudentCount: 10, submittedCount: 5, unsubmittedCount: 5, feedbackNeededCount: 3, feedbackDoneCount: 2 },
  { id: "as_4", homeworkId: "hw_2", classId: "class_5", assignedAt: "2026-05-24T09:00:00", dueAt: "2026-05-28T23:59:00", status: "published", targetStudentCount: 7, submittedCount: 0, unsubmittedCount: 7, feedbackNeededCount: 0, feedbackDoneCount: 0 },
  { id: "as_5", homeworkId: "hw_3", classId: "class_4", assignedAt: "2026-05-24T09:00:00", dueAt: "2026-05-30T21:00:00", status: "draft", targetStudentCount: 9, submittedCount: 0, unsubmittedCount: 9, feedbackNeededCount: 0, feedbackDoneCount: 0 }
];

const classFilterOptions = ["전체 반", ...classes.map((classItem) => classItem.name)];
const subjectFilterOptions = ["전체 과목", "Phonics", "AL", "AR"];
const statusFilterOptions = ["전체", "published", "draft", "마감 임박", "마감 지남", "미제출 있음"];
const sortOptions = ["최신순", "마감 임박순", "제출률 낮은 순", "제출률 높은 순"];

function progressPercent(assignment: Assignment) {
  return assignment.targetStudentCount === 0 ? 0 : Math.round((assignment.submittedCount / assignment.targetStudentCount) * 100);
}

function statusTone(status: HomeworkStatus) {
  return status === "published" ? "green" : "gray";
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
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("전체 반");
  const [subjectFilter, setSubjectFilter] = useState("전체 과목");
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
        const matchesSubject = subjectFilter === "전체 과목" || homework.subject === subjectFilter;
        const matchesStatus =
          statusFilter === "전체" ||
          assignment.status === statusFilter ||
          (statusFilter === "마감 임박" && isDueSoon(assignment.dueAt)) ||
          (statusFilter === "마감 지남" && isPastDue(assignment.dueAt)) ||
          (statusFilter === "미제출 있음" && assignment.unsubmittedCount > 0);
        return matchesQuery && matchesClass && matchesSubject && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "마감 임박순") return new Date(a.assignment.dueAt).getTime() - new Date(b.assignment.dueAt).getTime();
        if (sort === "제출률 낮은 순") return progressPercent(a.assignment) - progressPercent(b.assignment);
        if (sort === "제출률 높은 순") return progressPercent(b.assignment) - progressPercent(a.assignment);
        return new Date(b.assignment.assignedAt).getTime() - new Date(a.assignment.assignedAt).getTime();
      });
  }, [classFilter, query, sort, statusFilter, subjectFilter]);

  const homeworkRows = useMemo(() => {
    return homeworks
      .map((homework) => {
        const related = assignmentRows.filter((row) => row.homework.id === homework.id);
        return {
          homework,
          rows: related
        };
      })
      .filter((row) => row.rows.length > 0);
  }, [assignmentRows]);

  return (
    <TeacherLayout title="숙제 목록">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">숙제별 보기</h2>
          <p className="mt-1 text-sm text-slate-500">숙제 템플릿 기준으로 과목과 반별 배정 현황을 확인합니다.</p>
        </div>
        <Button href="/teacher/assignments/new">숙제 만들기</Button>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm font-semibold">숙제 검색<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="숙제명 검색" /></label>
          <label className="grid gap-2 text-sm font-semibold">과목 필터<Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>{subjectFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">반 필터<Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>{classFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">상태 필터<Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statusFilterOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">정렬<Select value={sort} onChange={(event) => setSort(event.target.value)}>{sortOptions.map((item) => <option key={item}>{item}</option>)}</Select></label>
        </div>
      </Card>

      <div className="grid gap-4">
        {homeworkRows.map((row) => <HomeworkCard key={row.homework.id} {...row} />)}
      </div>
    </TeacherLayout>
  );
}

function HomeworkCard({
  homework,
  rows
}: {
  homework: Homework;
  rows: Array<{ assignment: Assignment; homework: Homework; classItem: ClassRow }>;
}) {
  return (
    <Card>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{homework.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{homework.description}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">{homework.subject}</Badge><Badge>{homework.type}</Badge><Badge tone={statusTone(homework.status)}>{homework.status}</Badge></div>
          </div>
          <div className="flex shrink-0 justify-start xl:justify-end">
            <Button href={`/teacher/assignments/new?assignmentId=${homework.id}`} variant="secondary">내용 수정 & 재배정</Button>
          </div>
        </div>
        <div className="min-w-0">
          <div className="rounded-md border border-line">
            <div className="border-b border-line bg-slate-50 px-3 py-2 text-sm font-bold">반별 요약</div>
            {rows.map(({ assignment, classItem }) => {
              const progress = progressPercent(assignment);
              return (
                <div key={assignment.id} className="grid gap-2 border-b border-line px-3 py-3 text-sm last:border-b-0 lg:grid-cols-[1fr_190px_110px_90px] lg:items-center">
                  <span className="font-semibold">{classItem.name}</span>
                  <span>마감 {formatDue(assignment.dueAt)}</span>
                  <span>제출 {assignment.submittedCount}/{assignment.targetStudentCount}명</span>
                  <span>{progress}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
