"use client";

import { useEffect, useMemo, useState } from "react";

import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDue } from "@/lib/format";

type AssignmentClassSummary = {
  classId: string;
  className: string;
  dueAt: string | null;
  targetCount: number;
  submittedCount: number;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string;
  assignmentType: string;
  assignmentSubject: string;
  status: "published" | "draft" | "closed" | "archived" | string;
  classNames: string[];
  classSummaries: AssignmentClassSummary[];
  targetCount: number;
  submittedCount: number;
  unsubmittedCount: number;
  dueAt: string | null;
  updatedAt: string;
};

function statusTone(status: AssignmentRow["status"]) {
  if (status === "published") return "green";
  if (status === "draft") return "gray";
  if (status === "closed") return "yellow";
  return "gray";
}

function statusLabel(status: string) {
  if (status === "published") return "published";
  if (status === "draft") return "draft";
  if (status === "closed") return "closed";
  if (status === "archived") return "archived";
  return status;
}

function typeLabel(type: string) {
  if (type === "listening_recording") return "듣기/녹음";
  if (type === "image_speaking") return "이미지 보고 말하기";
  if (type === "sentence_shadowing") return "문장 따라 읽기";
  if (type === "free_speaking") return "자유 말하기";
  if (type === "writing") return "라이팅";
  if (type === "quiz") return "퀴즈";
  return type;
}

function subjectLabel(subject: string) {
  return subject || "기타";
}

function sortRows(rows: AssignmentRow[], sort: string) {
  const nextRows = [...rows];
  if (sort === "oldest") {
    return nextRows.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }
  if (sort === "due") {
    return nextRows.sort((a, b) => {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }
  return nextRows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export default function AssignmentsPage() {
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("latest");
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadAssignments() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/teacher/assignments", { cache: "no-store" });
        const data = await response.json();
        if (!ignore) setRows(data.assignments ?? []);
      } catch {
        if (!ignore) setRows([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadAssignments();
    return () => {
      ignore = true;
    };
  }, []);

  const subjects = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.assignmentSubject).filter(Boolean))).sort();
  }, [rows]);

  const classes = useMemo(() => {
    const classMap = new Map<string, string>();
    rows.forEach((row) => {
      row.classSummaries.forEach((summary) => classMap.set(summary.classId, summary.className));
    });
    return Array.from(classMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesQuery = !keyword || row.title.toLowerCase().includes(keyword) || row.description.toLowerCase().includes(keyword);
      const matchesSubject = subjectFilter === "all" || row.assignmentSubject === subjectFilter;
      const matchesClass = classFilter === "all" || row.classSummaries.some((summary) => summary.classId === classFilter);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesQuery && matchesSubject && matchesClass && matchesStatus;
    });
    return sortRows(filtered, sort);
  }, [classFilter, query, rows, sort, statusFilter, subjectFilter]);

  return (
    <TeacherLayout title="숙제 목록">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-700">강사용 목업</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-normal text-ink">숙제 목록</h1>
          <h2 className="mt-7 text-lg font-bold text-ink">숙제별 보기</h2>
          <p className="mt-1 text-sm text-slate-500">숙제 템플릿 기준으로 과목과 반별 배정 현황을 확인합니다.</p>
        </div>
        <Button href="/teacher/assignments/new" className="lg:self-center">숙제 만들기</Button>
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm font-semibold">
            숙제 검색
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="숙제명 검색" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            과목 필터
            <Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
              <option value="all">전체 과목</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subjectLabel(subject)}</option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            반 필터
            <Select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="all">전체 반</option>
              {classes.map(([classId, className]) => (
                <option key={classId} value={classId}>{className}</option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            상태 필터
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">전체</option>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="closed">closed</option>
              <option value="archived">archived</option>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            정렬
            <Select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="due">마감 빠른순</option>
            </Select>
          </label>
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredRows.map((row) => (
          <Card key={row.id} className="p-0">
            <div className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-ink">{row.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{row.description || "설명이 없습니다."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="blue">{subjectLabel(row.assignmentSubject)}</Badge>
                    <Badge>{typeLabel(row.assignmentType)}</Badge>
                    <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                  </div>
                </div>
                <Button href={`/teacher/assignments/new?assignmentId=${row.id}`} variant="secondary" className="shrink-0">
                  내용 수정 & 재배정
                </Button>
              </div>

              <div className="mt-5 overflow-hidden rounded-md border border-line">
                <div className="border-b border-line bg-slate-50 px-3 py-2 text-sm font-bold">반별 요약</div>
                {row.classSummaries.length > 0 ? (
                  <div className="divide-y divide-line">
                    {row.classSummaries.map((summary) => {
                      const progress = summary.targetCount === 0 ? 0 : Math.round((summary.submittedCount / summary.targetCount) * 100);
                      return (
                        <div key={`${row.id}-${summary.classId}`} className="grid gap-2 px-3 py-3 text-sm md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                          <strong className="text-ink">{summary.className}</strong>
                          <span className="text-slate-700">마감 {summary.dueAt ? formatDue(summary.dueAt) : "-"}</span>
                          <span className="text-slate-700">제출 {summary.submittedCount}/{summary.targetCount}명</span>
                          <span className="font-semibold text-slate-700">{progress}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-slate-500">아직 배정된 반이 없습니다.</div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {!isLoading && filteredRows.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">표시할 숙제가 없습니다.</p>
          </Card>
        )}
        {isLoading && (
          <Card>
            <p className="text-sm text-slate-500">숙제 목록을 불러오는 중입니다.</p>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
