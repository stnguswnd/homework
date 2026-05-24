"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { mockRepository } from "@/mocks/mockRepository";
import {
  gradeOptions,
  studentAvatars,
  studentRepository
} from "@/features/student-management/repositories/studentRepository";
import type { Class } from "@/types/class";
import type {
  ManagedStudent,
  StudentLearningHistory,
  StudentManagementTab
} from "@/features/student-management/types/studentManagement";

const tabs: Array<{ id: StudentManagementTab; label: string }> = [
  { id: "detail", label: "상세정보" },
  { id: "learning", label: "학습이력" }
];

type PasswordTarget = "student" | "parent";

const avatarLabel: Record<string, string> = {
  robot: "AI",
  "boy-blonde": "민",
  "girl-brown": "영",
  "boy-dark": "준",
  "girl-black": "윤",
  "boy-orange": "도",
  "girl-red": "린"
};

function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="모달 닫기">
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">{children}</div>;
}

function fieldDate(value: string) {
  return formatDateTime(value).replace("오전", "AM").replace("오후", "PM");
}

export function StudentManagementView({ initialStudents }: { initialStudents: ManagedStudent[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudents[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StudentManagementTab>("detail");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkCreateModalOpen, setIsBulkCreateModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<PasswordTarget | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [learningHistory, setLearningHistory] = useState<StudentLearningHistory[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0] ?? null;

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.name, student.studentId, student.parentId, ...student.classNames]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [searchQuery, students]);

  useEffect(() => {
    setClasses(mockRepository.getClasses().filter((classItem) => classItem.status === "active"));
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    studentRepository.getLearningHistory(selectedStudent.id).then(setLearningHistory);
  }, [selectedStudent]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function selectStudent(studentId: string) {
    setSelectedStudentId(studentId);
    setActiveTab("detail");
    setShowMobileDetail(true);
  }

  async function updateSelectedStudent(input: Partial<ManagedStudent>) {
    if (!selectedStudent) return;
    if ("name" in input && !input.name?.trim()) {
      setToast("학생 이름을 입력해주세요.");
      return;
    }
    const nextStudents = await studentRepository.updateStudent(selectedStudent.id, input, students);
    setStudents(nextStudents);
    setToast("학생 정보가 수정되었습니다.");
  }

  async function inactiveSelectedStudent() {
    if (!selectedStudent) return;
    const nextStudents = await studentRepository.deleteStudent(selectedStudent.id, students);
    setStudents(nextStudents);
    setIsDeleteConfirmOpen(false);
    setToast("학생 상태가 inactive로 변경되었습니다.");
  }

  async function changePassword(password: string) {
    if (!selectedStudent || !passwordTarget) return;
    const nextStudents = await studentRepository.updateStudent(
      selectedStudent.id,
      passwordTarget === "student" ? { password } : { parentPassword: password },
      students
    );
    setStudents(nextStudents);
    setPasswordTarget(null);
    setToast(passwordTarget === "student" ? "학생 비밀번호가 변경되었습니다." : "학부모 계정 비밀번호가 변경되었습니다.");
  }

  async function createStudent(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const classId = String(formData.get("classId") ?? "").trim();
    const selectedClass = classes.find((classItem) => classItem.id === classId);
    if (!name) {
      setToast("학생 이름을 입력해주세요.");
      return;
    }
    if (!selectedClass) {
      setToast("학생 등록 전에 반을 먼저 만들어주세요.");
      return;
    }
    const created = await studentRepository.createStudent({
      name,
      studentId: String(formData.get("studentId") ?? ""),
      password: String(formData.get("password") ?? ""),
      schoolName: String(formData.get("schoolName") ?? ""),
      grade: String(formData.get("grade") ?? ""),
      classId: selectedClass.id,
      className: selectedClass.name,
      avatarKey: String(formData.get("avatarKey") ?? "robot"),
      memo: String(formData.get("memo") ?? ""),
      parentId: String(formData.get("parentId") ?? ""),
      parentPassword: String(formData.get("parentPassword") ?? "")
    });
    setStudents((current) => [created, ...current]);
    setSelectedStudentId(created.id);
    setShowMobileDetail(true);
    setIsCreateModalOpen(false);
    setToast("학생이 등록되었습니다.");
  }

  async function bulkCreateStudents(csv: string) {
    const rows = csv.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    const dataRows = rows[0]?.includes("student_name") ? rows.slice(1) : rows;
    const existingIds = new Set(students.map((student) => student.studentId.toLowerCase()));
    const created: ManagedStudent[] = [];
    const skipped: string[] = [];

    for (const row of dataRows) {
      const [name, studentId, schoolName, grade, className, parentId] = row.split(",").map((value) => value?.trim() ?? "");
      if (!name) continue;
      if (studentId && existingIds.has(studentId.toLowerCase())) {
        skipped.push(studentId);
        continue;
      }
      const student = await studentRepository.createStudent({ name, studentId, schoolName, grade, className, parentId });
      existingIds.add(student.studentId.toLowerCase());
      created.push(student);
    }

    if (created.length > 0) {
      setStudents((current) => [...created, ...current]);
      setSelectedStudentId(created[0].id);
      setShowMobileDetail(true);
    }
    setToast(skipped.length > 0 ? `${created.length}명 등록, 중복 ID ${skipped.length}건 제외` : `${created.length}명이 등록되었습니다.`);
    setIsBulkCreateModalOpen(false);
  }

  return (
    <div className="relative">
      {toast && <div className="fixed right-4 top-4 z-50 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft">{toast}</div>}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <StudentSelector
          filteredStudents={filteredStudents}
          selectedStudentId={selectedStudent?.id ?? null}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSelect={selectStudent}
          hiddenOnMobile={showMobileDetail}
        />
        <section className={cn("min-w-0", !showMobileDetail && "hidden lg:block")}>
          <StudentDetailPanel
            student={selectedStudent}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onBack={() => setShowMobileDetail(false)}
            onCreate={() => setIsCreateModalOpen(true)}
            onBulkCreate={() => setIsBulkCreateModalOpen(true)}
            onStudentPassword={() => setPasswordTarget("student")}
            onParentPassword={() => setPasswordTarget("parent")}
            onDelete={() => setIsDeleteConfirmOpen(true)}
            onUpdate={updateSelectedStudent}
            learningHistory={learningHistory}
          />
        </section>
      </div>

      {isCreateModalOpen && <CreateStudentModal classes={classes} onClose={() => setIsCreateModalOpen(false)} onSubmit={createStudent} />}
      {isBulkCreateModalOpen && <BulkCreateModal onClose={() => setIsBulkCreateModalOpen(false)} onSubmit={bulkCreateStudents} />}
      {passwordTarget && (
        <PasswordModal
          title={passwordTarget === "student" ? "학생 비밀번호 변경" : "학부모 계정 비밀번호 변경"}
          onClose={() => setPasswordTarget(null)}
          onSubmit={changePassword}
        />
      )}
      {isDeleteConfirmOpen && (
        <ConfirmModal
          title="학생삭제"
          message="정말 이 학생을 삭제하시겠습니까? 학생의 학습 이력과 제출 기록도 함께 보이지 않게 됩니다."
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={inactiveSelectedStudent}
        />
      )}
    </div>
  );
}

function StudentSelector({
  filteredStudents,
  selectedStudentId,
  searchQuery,
  onSearch,
  onSelect,
  hiddenOnMobile
}: {
  filteredStudents: ManagedStudent[];
  selectedStudentId: string | null;
  searchQuery: string;
  onSearch: (value: string) => void;
  onSelect: (studentId: string) => void;
  hiddenOnMobile: boolean;
}) {
  return (
    <aside className={cn("rounded-lg border border-line bg-white p-4 shadow-soft lg:block", hiddenOnMobile && "hidden")}>
      <label className="grid gap-2 text-sm font-semibold">
        학생 검색
        <div className="relative">
          <Input value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="학생이름 or ID 검색" />
          <span className="absolute right-3 top-2.5 text-slate-400" aria-hidden="true">⌕</span>
        </div>
      </label>
      <div className="mt-4 max-h-[calc(100vh-260px)] min-h-80 overflow-auto pr-1">
        {filteredStudents.length === 0 ? (
          <EmptyState>검색 결과가 없습니다.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {filteredStudents.map((student) => (
              <button
                key={student.id}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border border-line p-3 text-left transition hover:border-action",
                  selectedStudentId === student.id && "border-action bg-blue-50"
                )}
                onClick={() => onSelect(student.id)}
              >
                <Avatar avatarKey={student.avatarKey} selected={selectedStudentId === student.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{student.name}</span>
                  <span className="block truncate text-xs text-slate-500">{student.studentId}</span>
                </span>
                <span className="text-slate-400" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm text-slate-500">
        <span>페이지 1</span>
        <span>{filteredStudents.length}명</span>
      </div>
    </aside>
  );
}

function StudentDetailPanel({
  student,
  activeTab,
  setActiveTab,
  onBack,
  onCreate,
  onBulkCreate,
  onStudentPassword,
  onParentPassword,
  onDelete,
  onUpdate,
  learningHistory
}: {
  student: ManagedStudent | null;
  activeTab: StudentManagementTab;
  setActiveTab: (tab: StudentManagementTab) => void;
  onBack: () => void;
  onCreate: () => void;
  onBulkCreate: () => void;
  onStudentPassword: () => void;
  onParentPassword: () => void;
  onDelete: () => void;
  onUpdate: (input: Partial<ManagedStudent>) => void;
  learningHistory: StudentLearningHistory[];
}) {
  if (!student) {
    return (
      <section className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <EmptyState>학생을 선택해주세요.</EmptyState>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold lg:hidden" onClick={onBack}>뒤로</button>
          <div>
            <p className="text-sm font-semibold text-action">학생관리</p>
            <h1 className="text-2xl font-bold">{student.name}</h1>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={onCreate}>학생등록</Button>
          <Button onClick={onBulkCreate} variant="secondary">일괄등록</Button>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto border-b border-line">
        <div className="flex min-w-max gap-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "border-b-2 px-1 py-3 text-sm font-bold",
                activeTab === tab.id ? "border-action text-action" : "border-transparent text-slate-500"
              )}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        {activeTab === "detail" && <DetailTab student={student} onStudentPassword={onStudentPassword} onParentPassword={onParentPassword} onDelete={onDelete} onUpdate={onUpdate} />}
        {activeTab === "learning" && <LearningTab history={learningHistory} />}
      </div>
    </section>
  );
}

function DetailTab({
  student,
  onStudentPassword,
  onParentPassword,
  onDelete,
  onUpdate
}: {
  student: ManagedStudent;
  onStudentPassword: () => void;
  onParentPassword: () => void;
  onDelete: () => void;
  onUpdate: (input: Partial<ManagedStudent>) => void;
}) {
  const [draft, setDraft] = useState(student);

  useEffect(() => {
    setDraft(student);
  }, [student]);

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-md border border-line bg-white">
        <DetailRow label="학생 아이디">
          <span className="font-semibold">{student.studentId}</span>
          <span className="ml-2 text-slate-500">({fieldDate(student.createdAt)})</span>
        </DetailRow>
        <DetailRow label="비밀번호">
          <Button variant="secondary" onClick={onStudentPassword}>비밀번호 변경</Button>
        </DetailRow>
        <DetailRow label="학생 이름">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </DetailRow>
        <DetailRow label="학교 정보">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Input value={draft.schoolName ?? ""} onChange={(event) => setDraft({ ...draft, schoolName: event.target.value })} />
            <Select value={draft.grade ?? ""} onChange={(event) => setDraft({ ...draft, grade: event.target.value })}>{gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}</Select>
          </div>
        </DetailRow>
        <DetailRow label="반 정보">
          <span className="font-medium">{student.classNames.length > 0 ? student.classNames.join(", ") : "미배정"}</span>
        </DetailRow>
        <DetailRow label="학생 아이콘">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {studentAvatars.map((avatar) => (
              <button
                key={avatar}
                className={cn("rounded-md border p-2", draft.avatarKey === avatar ? "border-action bg-blue-50" : "border-line")}
                onClick={() => setDraft({ ...draft, avatarKey: avatar })}
                aria-label={`${avatar} 아바타 선택`}
              >
                <Avatar avatarKey={avatar} selected={draft.avatarKey === avatar} />
              </button>
            ))}
          </div>
        </DetailRow>
        <DetailRow label="특이사항">
          <Textarea value={draft.memo ?? ""} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} />
        </DetailRow>
      </div>
      <div className="overflow-hidden rounded-md border border-line bg-white">
        <DetailRow label="학부모 계정 아이디">
          <span className="font-semibold">{draft.parentId || "미등록"}</span>
        </DetailRow>
        <DetailRow label="학부모 계정 비밀번호">
          <Button variant="secondary" onClick={onParentPassword}>비밀번호 변경</Button>
        </DetailRow>
      </div>
      <div className="grid gap-2 sm:flex sm:justify-end">
        <Button variant="danger" onClick={onDelete}>학생삭제</Button>
        <Button onClick={() => onUpdate(draft)}>정보 수정</Button>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid border-b border-line last:border-b-0 md:grid-cols-[220px_1fr]">
      <div className="bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">{label}</div>
      <div className="min-w-0 px-4 py-3 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function Avatar({ avatarKey, selected }: { avatarKey: string; selected?: boolean }) {
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold", selected ? "bg-action text-white" : "bg-slate-100 text-slate-700")}>
      {avatarLabel[avatarKey] ?? "ST"}
    </span>
  );
}

function LearningTab({ history }: { history: StudentLearningHistory[] }) {
  if (history.length === 0) return <EmptyState>아직 학습 이력이 없습니다.</EmptyState>;
  return (
    <Table headers={["날짜", "숙제명", "반", "유형", "제출 상태", "피드백 상태", "상세 보기"]}>
      {history.map((item) => (
        <tr key={item.id} className="border-t border-line">
          <td className="py-3">{item.date}</td>
          <td className="font-semibold">{item.assignmentTitle}</td>
          <td>{item.className ?? "-"}</td>
          <td>{assignmentTypeLabel(item.assignmentType)}</td>
          <td><Badge tone={item.submitStatus === "submitted" ? "green" : item.submitStatus === "late" ? "yellow" : "red"}>{submitStatusLabel(item.submitStatus)}</Badge></td>
          <td>{reviewStatusLabel(item.reviewStatus)}</td>
          <td>
            {item.detailHref ? (
              <Button href={item.detailHref} variant="secondary">상세</Button>
            ) : (
              <Button disabled variant="secondary">상세</Button>
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-slate-500">
          <tr>{headers.map((header) => <th key={header} className="py-2 font-bold">{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function CreateStudentModal({
  classes,
  onClose,
  onSubmit
}: {
  classes: Class[];
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const hasClasses = classes.length > 0;

  return (
    <Modal title="학생등록" onClose={onClose}>
      <form action={onSubmit} className="grid gap-4">
        {!hasClasses && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-danger">등록 가능한 반이 없습니다. 반을 먼저 만들어주세요.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">학생 이름<Input name="name" required /></label>
          <label className="grid gap-2 text-sm font-semibold">학생 아이디<Input name="studentId" placeholder="비워두면 자동 생성" /></label>
          <label className="grid gap-2 text-sm font-semibold">비밀번호<Input name="password" type="password" /></label>
          <label className="grid gap-2 text-sm font-semibold">학교명<Input name="schoolName" /></label>
          <label className="grid gap-2 text-sm font-semibold">학년<Select name="grade">{gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">반<Select name="classId" required disabled={!hasClasses}>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-semibold">학부모 아이디<Input name="parentId" /></label>
          <label className="grid gap-2 text-sm font-semibold">학부모 비밀번호<Input name="parentPassword" type="password" /></label>
        </div>
        <label className="grid gap-2 text-sm font-semibold">학생 아이콘<Select name="avatarKey">{studentAvatars.map((avatar) => <option key={avatar}>{avatar}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-semibold">특이사항<Textarea name="memo" /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>취소</Button><Button type="submit" disabled={!hasClasses}>등록</Button></div>
      </form>
    </Modal>
  );
}

function BulkCreateModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (csv: string) => void }) {
  const [csv, setCsv] = useState("student_name,student_id,school,grade,class_name,parent_id\n이지우,JIWOO24,연세초,초4,월수 Basic Speaking,jiwoo-parent\n박서준,SEOJUN7,서울초,초3,월수 Basic Speaking,seojun-parent");
  const previewRows = csv.split(/\r?\n/).slice(1).filter(Boolean).map((row) => row.split(","));

  return (
    <Modal title="일괄등록" onClose={onClose}>
      <div className="grid gap-4">
        <div className="rounded-md border border-dashed border-line p-4 text-sm text-slate-500">CSV 파일 선택 영역 목업</div>
        <Button type="button" variant="secondary" disabled>샘플 양식 다운로드</Button>
        <label className="grid gap-2 text-sm font-semibold">CSV 붙여넣기<Textarea value={csv} onChange={(event) => setCsv(event.target.value)} /></label>
        {previewRows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">이름</th><th>ID</th><th>학교</th><th>학년</th><th>반</th><th>학부모</th></tr></thead>
              <tbody>{previewRows.map((row, index) => <tr key={`${row.join("-")}-${index}`} className="border-t border-line">{row.slice(0, 6).map((cell, cellIndex) => <td key={cellIndex} className="p-2">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>취소</Button><Button onClick={() => onSubmit(csv)}>등록</Button></div>
      </div>
    </Modal>
  );
}

function PasswordModal({
  title,
  onClose,
  onSubmit
}: {
  title: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  function submit() {
    if (password.length < 8) {
      setMessage("새 비밀번호는 8자 이상을 권장합니다.");
      return;
    }
    if (password !== confirm) {
      setMessage("새 비밀번호와 확인값이 일치해야 합니다.");
      return;
    }
    onSubmit(password);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">변경 비밀번호<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">변경 비밀번호 확인<Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
        {message && <p className="text-sm font-semibold text-danger">{message}</p>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>취소</Button><Button onClick={submit}>변경</Button></div>
      </div>
    </Modal>
  );
}

function ConfirmModal({
  title,
  message,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm leading-6 text-slate-700">{message}</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onCancel}>취소</Button><Button variant="danger" onClick={onConfirm}>확인</Button></div>
    </Modal>
  );
}

function assignmentTypeLabel(type: StudentLearningHistory["assignmentType"]) {
  if (type === "listening_recording") return "듣기/녹음";
  if (type === "image_speaking") return "이미지 보고 말하기";
  if (type === "sentence_shadowing") return "문장 따라 읽기";
  if (type === "free_speaking") return "자유 말하기";
  if (type === "writing") return "라이팅";
  if (type === "vocabulary") return "단어";
  if (type === "general") return "일반";
  return "퀴즈";
}

function submitStatusLabel(status: StudentLearningHistory["submitStatus"]) {
  return status === "submitted" ? "제출 완료" : status === "late" ? "지각 제출" : "미제출";
}

function reviewStatusLabel(status: StudentLearningHistory["reviewStatus"]) {
  return status === "pending" ? "확인 전" : status === "reviewed" ? "확인 완료" : "-";
}
