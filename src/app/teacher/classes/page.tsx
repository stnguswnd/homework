"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/Button";
import { mockRepository } from "@/mocks/mockRepository";
import type { Assignment } from "@/types/assignment";

type Subject = "Phonics" | "AL" | "AR";
type SubjectFilter = "전체" | Subject;

type StudentHomework = {
  subject: Subject;
  title: string;
  href: string;
};

type TeamStudent = {
  id: string;
  name: string;
  href: string;
  reviewRequested: StudentHomework[];
  incomplete: StudentHomework[];
};

type Team = {
  id: string;
  name: string;
  subjects: Subject[];
  students: TeamStudent[];
};

function assignmentSubject(assignment: Assignment): Subject {
  if (assignment.id === "assignment-1") return "AL";
  if (assignment.id === "assignment-2") return "AR";
  return "Phonics";
}

function buildTeams(): Team[] {
  return mockRepository.getClasses().map((classItem) => {
    const students = mockRepository.getStudentsByClassId(classItem.id);
    const assignments = mockRepository.getAssignmentsByClassId(classItem.id);
    return {
      id: classItem.id,
      name: classItem.name,
      subjects: ["Phonics", "AL", "AR"],
      students: students.map((student) => {
        const reviewRequested: StudentHomework[] = [];
        const incomplete: StudentHomework[] = [];
        for (const assignment of assignments) {
          const submission = mockRepository
            .getSubmissionsByAssignmentId(assignment.id)
            .find((item) => item.studentId === student.id);
          const homework = {
            subject: assignmentSubject(assignment),
            title: assignment.title,
            href: `/teacher/assignments/${assignment.id}`
          };
          if (!submission || submission.status === "not_submitted") {
            incomplete.push(homework);
          } else if (submission.status === "submitted") {
            reviewRequested.push(homework);
          }
        }
        return {
          id: student.id,
          name: student.name,
          href: `/teacher/students/${student.id}`,
          reviewRequested,
          incomplete
        };
      })
    };
  });
}

function filterHomeworks(items: StudentHomework[], filter: SubjectFilter) {
  if (filter === "전체") return items;
  return items.filter((item) => item.subject === filter);
}

function HomeworkPill({ homework, tone }: { homework: StudentHomework; tone: "review" | "incomplete" }) {
  return (
    <a
      href={homework.href}
      onClick={(event) => event.stopPropagation()}
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        tone === "review"
          ? "border-blue-100 bg-blue-50 text-blue-700"
          : "border-red-100 bg-red-50 text-red-700"
      }`}
    >
      <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-bold">{homework.subject}</span>
      <span className="truncate">{homework.title}</span>
    </a>
  );
}

function TeamCard({
  team,
  filter,
  onFilterChange
}: {
  team: Team;
  filter: SubjectFilter;
  onFilterChange: (filter: SubjectFilter) => void;
}) {
  const filters: SubjectFilter[] = ["전체", ...team.subjects];
  const router = useRouter();

  return (
    <section className="flex min-h-[620px] w-[320px] shrink-0 flex-col rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{team.name}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">학생 {team.students.length}명</p>
        </div>
        <Button type="button" variant="secondary" className="min-h-9 px-3 py-1.5 text-xs">과목 추가</Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              filter === item ? "border-action bg-action text-white" : "border-line bg-white text-slate-600 hover:border-action"
            }`}
            onClick={() => onFilterChange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid flex-1 gap-3 overflow-y-auto pr-1">
        {team.students.map((student) => {
          const reviewRequested = filterHomeworks(student.reviewRequested, filter);
          const incomplete = filterHomeworks(student.incomplete, filter);
          return (
            <article
              key={student.id}
              className="cursor-pointer rounded-md border border-line bg-slate-50 p-3 transition hover:border-action hover:bg-blue-50/40"
              role="button"
              tabIndex={0}
              onClick={() => router.push(student.href)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") router.push(student.href);
              }}
            >
              <h3 className="font-bold">{student.name}</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="grid grid-cols-[64px_1fr] gap-2">
                  <p className="pt-1 text-xs font-bold text-blue-700">검토요청</p>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {reviewRequested.length > 0 ? reviewRequested.map((homework) => <HomeworkPill key={`${student.id}-review-${homework.subject}-${homework.title}`} homework={homework} tone="review" />) : <span className="text-xs text-slate-400">없음</span>}
                  </div>
                </div>
                <div className="grid grid-cols-[64px_1fr] gap-2 border-t border-line pt-2">
                  <p className="pt-1 text-xs font-bold text-red-700">미완료</p>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {incomplete.length > 0 ? incomplete.map((homework) => <HomeworkPill key={`${student.id}-incomplete-${homework.subject}-${homework.title}`} homework={homework} tone="incomplete" />) : <span className="text-xs text-slate-400">없음</span>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <Button href={`/teacher/classes/${team.id}`} className="mt-4 w-full" variant="secondary">반 상세 보기</Button>
    </section>
  );
}

export default function ClassesPage() {
  const teams = buildTeams();
  const [filters, setFilters] = useState<Record<string, SubjectFilter>>(() =>
    Object.fromEntries(teams.map((team) => [team.id, "전체"]))
  );

  return (
    <TeacherLayout title="팀 관리">
      <div className="mb-5">
        <h2 className="text-lg font-bold">팀별 숙제 상태</h2>
        <p className="mt-1 text-sm text-slate-500">팀 카드를 좌우로 비교하면서 학생별 검토요청과 미완료 숙제를 확인합니다.</p>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-max gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              filter={filters[team.id] ?? "전체"}
              onFilterChange={(filter) => setFilters((current) => ({ ...current, [team.id]: filter }))}
            />
          ))}
        </div>
      </div>
    </TeacherLayout>
  );
}
