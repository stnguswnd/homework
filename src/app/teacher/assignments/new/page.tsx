"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  ASSIGNMENT_SUBJECTS,
  assignmentTypeLabel,
  normalizeAssignmentSubject,
  type AssignmentSubject,
  type AssignmentType,
  type WritingMode,
  type WritingUnit,
} from "@/lib/assignmentTypes";

type VocabularyRow = {
  word: string;
  meaning: string;
};

type TemplateState = {
  title: string;
  type: AssignmentType | "";
  subject: AssignmentSubject;
  description: string;
  passageTitle: string;
  passageText: string;
  minRecordingSec: string;
  maxRecordingSec: string;
  audioFileName: string;
  imageUrl: string;
  writingMode: WritingMode;
  writingUnit: WritingUnit;
  promptText: string;
  writingInstructions: string;
  writingHint: string;
  writingExample: string;
  vocabularyRows: VocabularyRow[];
};

const TYPE_CARDS: Array<{ type: AssignmentType; title: string; description: string }> = [
  { type: "listening_recording", title: "RL 녹음", description: "음원을 듣고 학생이 녹음 파일을 제출하는 숙제" },
  { type: "listening", title: "리스닝", description: "음원을 끝까지 듣기만 하면 완료되는 숙제" },
  { type: "writing", title: "라이팅", description: "이미지나 주제를 보고 글을 작성하고 AI 첨삭을 받는 숙제" },
  { type: "vocabulary_example", title: "단어장 예문", description: "단어별 예문 작성, AI 첨삭, 다시 쓰기를 진행하는 숙제" },
  { type: "vocabulary_recording", title: "단어장 녹음", description: "단어장을 순서대로 읽고 녹음 파일 1개를 제출하는 숙제" },
];

function createAssignmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `assignment-${crypto.randomUUID()}`;
  return `assignment-${Date.now()}`;
}

function emptyTemplate(): TemplateState {
  return {
    title: "",
    type: "",
    subject: "Phonics",
    description: "",
    passageTitle: "",
    passageText: "",
    minRecordingSec: "3",
    maxRecordingSec: "120",
    audioFileName: "",
    imageUrl: "",
    writingMode: "picture_description",
    writingUnit: "paragraphs",
    promptText: "",
    writingInstructions: "",
    writingHint: "",
    writingExample: "",
    vocabularyRows: [
      { word: "apple", meaning: "사과" },
      { word: "library", meaning: "도서관" },
      { word: "happy", meaning: "행복한" },
    ],
  };
}

export default function NewAssignmentPage() {
  return (
    <Suspense fallback={<TeacherLayout title="숙제 생성"><Card><p className="text-sm text-slate-500">숙제 작성 화면을 불러오는 중입니다.</p></Card></TeacherLayout>}>
      <NewAssignmentForm />
    </Suspense>
  );
}

function NewAssignmentForm() {
  const searchParams = useSearchParams();
  const routeAssignmentId = searchParams.get("assignmentId");
  const isEditMode = Boolean(routeAssignmentId);
  const [newAssignmentId] = useState(createAssignmentId);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [template, setTemplate] = useState<TemplateState>(emptyTemplate);

  const currentAssignmentId = routeAssignmentId ?? newAssignmentId;
  const selectedType = template.type || "listening_recording";
  const shouldShowTypeModal = !isEditMode && !template.type;
  const isWriting = selectedType === "writing";
  const isVocabulary = selectedType === "vocabulary_example" || selectedType === "vocabulary_recording";
  const isPictureWriting = isWriting && template.writingMode === "picture_description";

  useEffect(() => {
    if (!routeAssignmentId) return;
    const assignmentId = routeAssignmentId;
    let ignore = false;

    async function loadAssignment() {
      const response = await fetch(`/api/teacher/assignments?id=${encodeURIComponent(assignmentId)}`, { cache: "no-store" });
      const data = await response.json();
      if (ignore || !data.assignment) return;

      setTemplate({
        title: data.assignment.title ?? "",
        type: data.assignment.type ?? "listening_recording",
        subject: normalizeAssignmentSubject(data.assignment.subject),
        description: data.assignment.description ?? "",
        passageTitle: data.assignment.item?.title ?? "",
        passageText: data.assignment.item?.passageText ?? "",
        minRecordingSec: String(data.assignment.item?.minRecordingSec ?? "3"),
        maxRecordingSec: String(data.assignment.item?.maxRecordingSec ?? "120"),
        audioFileName: data.assignment.item?.audioFileName ?? "",
        imageUrl: data.assignment.imageUrl || "",
        writingMode: data.assignment.item?.writingMode ?? "picture_description",
        writingUnit: data.assignment.item?.writingUnit ?? "paragraphs",
        promptText: data.assignment.item?.promptText ?? "",
        writingInstructions: data.assignment.item?.writingInstructions ?? "",
        writingHint: data.assignment.item?.writingHint ?? "",
        writingExample: data.assignment.item?.writingExample ?? "",
        vocabularyRows: data.assignment.vocabularyItems?.length
          ? data.assignment.vocabularyItems.map((item: { word: string; meaning: string }) => ({ word: item.word, meaning: item.meaning }))
          : emptyTemplate().vocabularyRows,
      });
    }

    loadAssignment().catch(() => setMessage("수정할 숙제를 불러오지 못했습니다."));
    return () => {
      ignore = true;
    };
  }, [routeAssignmentId]);

  function selectInitialType(type: AssignmentType) {
    if (isEditMode || template.type) return;
    setTemplate((current) => ({
      ...current,
      type,
      minRecordingSec: type === "vocabulary_recording" ? "10" : current.minRecordingSec,
      maxRecordingSec: type === "vocabulary_recording" ? "120" : current.maxRecordingSec,
      passageTitle: type === "vocabulary_example" ? "Vocabulary Sentence Writing" : type === "vocabulary_recording" ? "Vocabulary Reading" : current.passageTitle,
      passageText: type === "vocabulary_example" ? "Write a sentence using a given vocabulary." : type === "vocabulary_recording" ? "Read out loud and record." : current.passageText,
    }));
  }

  function previewImage(file?: File) {
    if (!file) {
      setImageFile(null);
      setTemplate((current) => ({ ...current, imageUrl: "" }));
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setTemplate((current) => ({ ...current, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function onAudioChange(file?: File) {
    setAudioFile(file ?? null);
    setTemplate((current) => ({ ...current, audioFileName: file?.name ?? current.audioFileName }));
  }

  function validVocabularyRows() {
    const rows = template.vocabularyRows.map((row) => ({ word: row.word.trim(), meaning: row.meaning.trim() }));
    const incomplete = rows.some((row) => (row.word && !row.meaning) || (!row.word && row.meaning));
    if (incomplete) return { error: "영단어와 한글 뜻을 모두 입력해주세요.", rows: [] as VocabularyRow[] };
    const validRows = rows.filter((row) => row.word && row.meaning).slice(0, 200);
    if (isVocabulary && validRows.length === 0) return { error: "단어를 1개 이상 입력해주세요.", rows: [] as VocabularyRow[] };
    return { error: "", rows: validRows };
  }

  function saveAssignment() {
    if (!template.type) {
      setMessage("먼저 숙제 유형을 선택해주세요.");
      return;
    }
    if (!template.title.trim()) {
      setMessage("숙제 제목을 입력해주세요.");
      return;
    }
    if (template.type === "writing" && template.writingMode === "topic_diary" && !template.promptText.trim()) {
      setMessage("주제/일기 쓰기 숙제는 주제 텍스트가 필요합니다.");
      return;
    }
    const vocabulary = validVocabularyRows();
    if (vocabulary.error) {
      setMessage(vocabulary.error);
      return;
    }

    startSaving(async () => {
      const formData = new FormData();
      formData.set("id", currentAssignmentId);
      formData.set("title", template.title);
      formData.set("type", template.type as AssignmentType);
      formData.set("subject", template.subject);
      formData.set("description", template.description);
      formData.set("passageTitle", template.passageTitle);
      formData.set("passageText", template.type === "writing" && template.writingMode === "topic_diary" ? template.promptText : template.passageText);
      formData.set("minRecordingSec", template.minRecordingSec);
      formData.set("maxRecordingSec", template.maxRecordingSec);
      formData.set("audioFileName", template.audioFileName);
      formData.set("imageUrl", template.imageUrl);
      formData.set("writingMode", template.writingMode);
      formData.set("writingUnit", template.writingUnit);
      formData.set("writingUnitCount", "4");
      formData.set("promptText", template.promptText);
      formData.set("writingInstructions", template.writingInstructions);
      formData.set("writingHint", template.writingHint);
      formData.set("writingExample", template.writingExample);
      formData.set("vocabularyItems", JSON.stringify(vocabulary.rows.map((row, index) => ({ ...row, orderIndex: index }))));
      if (imageFile) formData.set("imageFile", imageFile, imageFile.name);
      if (audioFile) formData.set("audioFile", audioFile, audioFile.name);

      const response = await fetch("/api/teacher/assignments", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "숙제 저장 중 오류가 발생했습니다.");
        return;
      }

      setImageFile(null);
      setAudioFile(null);
      setTemplate((current) => ({
        ...current,
        imageUrl: data.assignment?.imageUrl || current.imageUrl,
        audioFileName: data.assignment?.item?.audioFileName || current.audioFileName,
      }));
      setMessage(isEditMode ? "숙제가 수정되었습니다. 배정은 숙제 목록에서 진행해주세요." : "숙제가 생성되었습니다. 숙제 목록에서 체크 후 배정해주세요.");
    });
  }

  return (
    <TeacherLayout title={isEditMode ? "숙제 수정" : "숙제 생성"}>
      <div className="grid gap-5">
        {message && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-action">{message}</p>}
        <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-action">
          이 화면에서는 숙제 원본 내용만 {isEditMode ? "수정" : "생성"}합니다. 반/학생 배정은 숙제 목록에서 체크 후 진행해주세요.
        </p>

        <Card>
          <div className="mb-5">
            <h2 className="text-xl font-bold">숙제 내용</h2>
            <p className="mt-1 text-sm text-slate-500">숙제 유형은 처음 만들 때만 선택할 수 있고, 이후에는 변경할 수 없습니다.</p>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                숙제 제목
                <Input value={template.title} onChange={(event) => setTemplate({ ...template, title: event.target.value })} placeholder="숙제 제목" disabled={shouldShowTypeModal} />
              </label>
              <div className="grid gap-2 text-sm font-semibold">
                숙제 유형
                <div className="flex min-h-10 items-center justify-between rounded-md border border-line bg-slate-50 px-3 py-2">
                  <Badge tone="blue">{template.type ? assignmentTypeLabel(template.type) : "선택 필요"}</Badge>
                  <span className="text-xs font-semibold text-slate-500">유형 변경 불가</span>
                </div>
              </div>
            </div>

            <SubjectPicker value={template.subject} disabled={shouldShowTypeModal} onChange={(subject) => setTemplate({ ...template, subject })} />

            <label className="grid gap-2 text-sm font-semibold">
              설명
              <Textarea value={template.description} onChange={(event) => setTemplate({ ...template, description: event.target.value })} placeholder="학생에게 보여줄 설명" disabled={shouldShowTypeModal} />
            </label>

            {(selectedType === "listening_recording" || selectedType === "listening") && (
              <>
                <AudioUpload template={template} disabled={shouldShowTypeModal} onAudioChange={onAudioChange} />
                <ImageUpload template={template} disabled={shouldShowTypeModal} previewImage={previewImage} />
                <ListeningFields template={template} setTemplate={setTemplate} selectedType={selectedType} disabled={shouldShowTypeModal} />
              </>
            )}

            {selectedType === "writing" && (
              <>
                {isPictureWriting && <ImageUpload template={template} disabled={shouldShowTypeModal} previewImage={previewImage} />}
                <WritingFields template={template} setTemplate={setTemplate} disabled={shouldShowTypeModal} />
              </>
            )}

            {selectedType === "vocabulary_example" && (
              <VocabularyExampleFields template={template} setTemplate={setTemplate} disabled={shouldShowTypeModal} />
            )}

            {selectedType === "vocabulary_recording" && (
              <VocabularyRecordingFields template={template} setTemplate={setTemplate} disabled={shouldShowTypeModal} onAudioChange={onAudioChange} />
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button href="/teacher/assignments" variant="secondary">취소</Button>
              <Button type="button" onClick={saveAssignment} disabled={isSaving || shouldShowTypeModal}>
                {isSaving ? "저장 중..." : isEditMode ? "수정 저장" : "숙제 생성"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {shouldShowTypeModal && <TypePicker onSelect={selectInitialType} />}
    </TeacherLayout>
  );
}

function SubjectPicker({ value, disabled, onChange }: { value: AssignmentSubject; disabled: boolean; onChange: (subject: AssignmentSubject) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">과목 유형</p>
      <div className="flex flex-wrap gap-2">
        {ASSIGNMENT_SUBJECTS.map((subject) => (
          <button
            key={subject}
            type="button"
            disabled={disabled}
            onClick={() => onChange(subject)}
            className={
              value === subject
                ? "rounded-full bg-action px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                : "rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-action disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {subject}
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold text-slate-500">반 관리의 과목 필터는 여기서 선택한 과목 유형 기준으로 표시됩니다.</p>
    </div>
  );
}

function AudioUpload({ template, disabled, onAudioChange }: { template: TemplateState; disabled: boolean; onAudioChange: (file?: File) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <label className="grid gap-2 text-sm font-semibold">
        원본 MP3 업로드
        <Input type="file" accept="audio/*" onChange={(event) => onAudioChange(event.target.files?.[0])} disabled={disabled} />
      </label>
      <div className="grid gap-2 text-sm font-semibold">
        MP3 파일명
        <div className="min-h-10 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{template.audioFileName || "선택한 파일 없음"}</div>
      </div>
    </div>
  );
}

function ImageUpload({ template, disabled, previewImage }: { template: TemplateState; disabled: boolean; previewImage: (file?: File) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <label className="grid gap-2 text-sm font-semibold">
        숙제 이미지 업로드
        <Input type="file" accept="image/*" onChange={(event) => previewImage(event.target.files?.[0])} disabled={disabled} />
      </label>
      <div className="grid gap-2 text-sm font-semibold">
        이미지 미리보기
        <div className="grid h-44 place-items-center overflow-hidden rounded-md border border-line bg-slate-50">
          {template.imageUrl ? <img src={template.imageUrl} alt="숙제 이미지 미리보기" className="h-full w-full object-contain" /> : <span className="text-sm font-medium text-slate-400">선택한 이미지 없음</span>}
        </div>
      </div>
    </div>
  );
}

function WritingFields({ template, setTemplate, disabled }: { template: TemplateState; setTemplate: (value: TemplateState) => void; disabled: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          Writing 방식
          <Select value={template.writingMode} onChange={(event) => setTemplate({ ...template, writingMode: event.target.value as WritingMode })} disabled={disabled}>
            <option value="picture_description">그림 묘사</option>
            <option value="topic_diary">주제/일기 쓰기</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          작성 단위
          <Select value={template.writingUnit} onChange={(event) => setTemplate({ ...template, writingUnit: event.target.value as WritingUnit })} disabled={disabled}>
            <option value="paragraphs">4 paragraphs</option>
            <option value="sentences">4 sentences</option>
          </Select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        {template.writingMode === "topic_diary" ? "주제 텍스트" : "추가 주제 또는 관찰 포인트"}
        <Textarea value={template.promptText} onChange={(event) => setTemplate({ ...template, promptText: event.target.value })} disabled={disabled} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        추가 지시문
        <Textarea value={template.writingInstructions} onChange={(event) => setTemplate({ ...template, writingInstructions: event.target.value })} placeholder="예: Use past tense." disabled={disabled} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          힌트
          <Textarea value={template.writingHint} onChange={(event) => setTemplate({ ...template, writingHint: event.target.value })} disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          예시 문장
          <Textarea value={template.writingExample} onChange={(event) => setTemplate({ ...template, writingExample: event.target.value })} disabled={disabled} />
        </label>
      </div>
    </div>
  );
}

function ListeningFields({ template, setTemplate, selectedType, disabled }: { template: TemplateState; setTemplate: (value: TemplateState) => void; selectedType: AssignmentType; disabled: boolean }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          지문 제목
          <Input value={template.passageTitle} onChange={(event) => setTemplate({ ...template, passageTitle: event.target.value })} placeholder="지문 제목" disabled={disabled} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm font-semibold">
            최소 녹음 시간
            <Input type="number" value={template.minRecordingSec} onChange={(event) => setTemplate({ ...template, minRecordingSec: event.target.value })} disabled={disabled || selectedType === "listening"} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            최대 녹음 시간
            <Input type="number" value={template.maxRecordingSec} onChange={(event) => setTemplate({ ...template, maxRecordingSec: event.target.value })} disabled={disabled || selectedType === "listening"} />
          </label>
        </div>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        지문 내용
        <Textarea value={template.passageText} onChange={(event) => setTemplate({ ...template, passageText: event.target.value })} placeholder="학생이 볼 지문 또는 스크립트" disabled={disabled} />
      </label>
    </>
  );
}

function VocabularyExampleFields({ template, setTemplate, disabled }: { template: TemplateState; setTemplate: (value: TemplateState) => void; disabled: boolean }) {
  return (
    <div className="grid gap-4">
      <VocabularyItemsEditor rows={template.vocabularyRows} disabled={disabled} onChange={(vocabularyRows) => setTemplate({ ...template, vocabularyRows })} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          기본 지시문
          <Input value={template.passageText} onChange={(event) => setTemplate({ ...template, passageText: event.target.value })} placeholder="Write a sentence using a given vocabulary." disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          추가 지시문
          <Input value={template.writingInstructions} onChange={(event) => setTemplate({ ...template, writingInstructions: event.target.value })} placeholder="예: 문장에는 현재 시제를 사용하세요." disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          힌트
          <Input value={template.writingHint} onChange={(event) => setTemplate({ ...template, writingHint: event.target.value })} placeholder="예: 단어의 형태나 의미를 떠올려 보세요." disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          예시 문장
          <Input value={template.writingExample} onChange={(event) => setTemplate({ ...template, writingExample: event.target.value })} placeholder="예: I read a book in the library." disabled={disabled} />
        </label>
      </div>
      <div className="grid gap-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-slate-700 md:grid-cols-3">
        <label><input type="checkbox" checked readOnly className="mr-2" />단어당 1회 첨삭</label>
        <label><input type="checkbox" checked readOnly className="mr-2" />전/다음 단어 이동 허용</label>
        <label><input type="checkbox" checked readOnly className="mr-2" />마지막 단어에서 제출</label>
      </div>
    </div>
  );
}

function VocabularyRecordingFields({ template, setTemplate, disabled, onAudioChange }: { template: TemplateState; setTemplate: (value: TemplateState) => void; disabled: boolean; onAudioChange: (file?: File) => void }) {
  return (
    <div className="grid gap-4">
      <VocabularyItemsEditor rows={template.vocabularyRows} disabled={disabled} onChange={(vocabularyRows) => setTemplate({ ...template, vocabularyRows })} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          기본 지시문
          <Input value={template.passageText} onChange={(event) => setTemplate({ ...template, passageText: event.target.value })} placeholder="Read out loud and record." disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          추가 안내
          <Input value={template.writingInstructions} onChange={(event) => setTemplate({ ...template, writingInstructions: event.target.value })} placeholder="예: 정확하게 발음하고 필요한 경우 다시 녹음해도 좋아요." disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          최소 녹음 시간(초)
          <Input type="number" value={template.minRecordingSec} onChange={(event) => setTemplate({ ...template, minRecordingSec: event.target.value })} disabled={disabled} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          최대 녹음 시간(초)
          <Input type="number" value={template.maxRecordingSec} onChange={(event) => setTemplate({ ...template, maxRecordingSec: event.target.value })} disabled={disabled} />
        </label>
      </div>
      <div className="grid gap-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-slate-700 md:grid-cols-3">
        <label><input type="checkbox" checked readOnly className="mr-2" />전체 단어장 한 번에 녹음</label>
        <label><input type="checkbox" checked readOnly className="mr-2" />녹음 후 다시 듣기 허용</label>
        <label><input type="checkbox" checked readOnly className="mr-2" />다시 녹음하기 허용</label>
      </div>
      <div className="grid gap-2 text-sm font-semibold">
        발음 가이드 음원(선택)
        <Input type="file" accept="audio/*" onChange={(event) => onAudioChange(event.target.files?.[0])} disabled={disabled} />
        <p className="text-xs text-slate-500">권장 형식: MP3, 최대 20MB. 학생 제출에는 필수가 아닙니다.</p>
      </div>
    </div>
  );
}

function VocabularyItemsEditor({ rows, disabled, onChange }: { rows: VocabularyRow[]; disabled: boolean; onChange: (rows: VocabularyRow[]) => void }) {
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const validCount = rows.filter((row) => row.word.trim() && row.meaning.trim()).length;

  function updateRow(index: number, patch: Partial<VocabularyRow>) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function addRow() {
    if (rows.length >= 200) return;
    onChange([...rows, { word: "", meaning: "" }]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  function applyPaste(text: string) {
    const parsed = parseVocabularyPaste(text);
    if (parsed.length) onChange([...rows, ...parsed].slice(0, 200));
    setIsPasteOpen(false);
  }

  return (
    <section className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">단어장 입력</h3>
          <p className="mt-1 text-sm text-slate-500">엑셀에서 영단어와 한글 뜻 두 열을 복사해 붙여넣을 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={addRow} disabled={disabled || rows.length >= 200}>+ 행 추가</Button>
          <Button type="button" variant="secondary" onClick={() => setIsPasteOpen(true)} disabled={disabled}>일괄 붙여넣기</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="w-16 px-3 py-2">번호</th>
              <th className="px-3 py-2">영단어</th>
              <th className="px-3 py-2">한글 뜻</th>
              <th className="w-24 px-3 py-2">삭제</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-line">
                <td className="px-3 py-2 text-center font-bold">{index + 1}</td>
                <td className="px-3 py-2">
                  <Input value={row.word} onChange={(event) => updateRow(index, { word: event.target.value })} disabled={disabled} />
                </td>
                <td className="px-3 py-2">
                  <Input value={row.meaning} onChange={(event) => updateRow(index, { meaning: event.target.value })} disabled={disabled} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Button type="button" variant="ghost" onClick={() => removeRow(index)} disabled={disabled || rows.length <= 1}>삭제</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-sm font-semibold text-slate-500">
        <span>총 {validCount}개 단어</span>
        <span>단어 수: {validCount} / 200</span>
      </div>
      {isPasteOpen && <BulkPasteVocabularyModal onClose={() => setIsPasteOpen(false)} onApply={applyPaste} />}
    </section>
  );
}

function parseVocabularyPaste(text: string): VocabularyRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      return { word: String(parts[0] ?? "").trim(), meaning: String(parts[1] ?? "").trim() };
    })
    .filter((row) => row.word && row.meaning);
}

function BulkPasteVocabularyModal({ onClose, onApply }: { onClose: () => void; onApply: (text: string) => void }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseVocabularyPaste(text), [text]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-xl font-extrabold">단어 일괄 붙여넣기</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">엑셀에서 영단어와 한글 뜻 두 열을 복사해 붙여넣어주세요.</p>
        <Textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-4 min-h-[220px]" placeholder={"apple\t사과\nlibrary\t도서관\nhappy\t행복한"} />
        <p className="mt-2 text-sm font-semibold text-slate-500">적용 가능한 단어 {parsed.length}개</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
          <Button type="button" onClick={() => onApply(text)} disabled={!parsed.length}>붙여넣기 적용</Button>
        </div>
      </div>
    </div>
  );
}

function TypePicker({ onSelect }: { onSelect: (type: AssignmentType) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-xl font-extrabold">어떤 숙제를 만들까요?</h2>
        <p className="mt-2 text-sm text-slate-500">숙제 유형은 처음 선택 후 변경할 수 없습니다.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {TYPE_CARDS.map((card) => (
            <button
              key={card.type}
              type="button"
              onClick={() => onSelect(card.type)}
              className="rounded-lg border border-line bg-white p-5 text-left shadow-sm transition hover:border-action hover:bg-blue-50"
            >
              <p className="text-lg font-extrabold">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
