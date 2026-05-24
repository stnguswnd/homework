import type { Assignment } from "@/types/assignment";
import type { Class } from "@/types/class";
import type { Student } from "@/types/student";
import type { Submission } from "@/types/submission";

export const mockClasses: Class[] = [
  {
    id: "class-a",
    teacherId: "teacher-1",
    name: "월수 Basic Speaking",
    description: "초등 4-5학년 말하기 기초반",
    status: "active",
    studentCount: 8,
    createdAt: "2026-05-01T09:00:00.000Z"
  },
  {
    id: "class-b",
    teacherId: "teacher-1",
    name: "화목 Reading Plus",
    description: "읽기와 듣기 병행반",
    status: "active",
    studentCount: 6,
    createdAt: "2026-05-04T09:00:00.000Z"
  },
  {
    id: "class-c",
    teacherId: "teacher-1",
    name: "토요 Interview",
    description: "발표와 인터뷰 집중반",
    status: "archived",
    studentCount: 5,
    createdAt: "2026-04-11T09:00:00.000Z"
  }
];

export const mockStudents: Student[] = [
  { id: "student-1", teacherId: "teacher-1", name: "이지우", studentLoginId: "JIWOO24", accessCode: "JIWOO24", classIds: ["class-a"], status: "active", memo: "목소리가 작음", createdAt: "2026-05-01T09:00:00.000Z" },
  { id: "student-2", teacherId: "teacher-1", name: "박서준", studentLoginId: "SEOJUN7", accessCode: "SEOJUN7", classIds: ["class-a"], status: "active", createdAt: "2026-05-01T09:00:00.000Z" },
  { id: "student-3", teacherId: "teacher-1", name: "최하윤", studentLoginId: "HAYUN9", accessCode: "HAYUN9", classIds: ["class-a", "class-b"], status: "active", createdAt: "2026-05-02T09:00:00.000Z" },
  { id: "student-4", teacherId: "teacher-1", name: "정도윤", studentLoginId: "DOYUN1", accessCode: "DOYUN1", classIds: ["class-b"], status: "inactive", createdAt: "2026-05-03T09:00:00.000Z" },
  { id: "student-5", teacherId: "teacher-1", name: "한아린", studentLoginId: "ARIN55", accessCode: "ARIN55", classIds: ["class-b"], status: "active", createdAt: "2026-05-03T09:00:00.000Z" }
];

export const mockAssignments: Assignment[] = [
  {
    id: "assignment-1",
    teacherId: "teacher-1",
    classId: "class-a",
    title: "Discovery Unit 1 Speaking Homework",
    description: "원어민 음성을 듣고 같은 속도로 읽어 보세요.",
    assignmentType: "listening_recording",
    dueAt: "2026-05-25T14:59:00.000Z",
    status: "published",
    createdAt: "2026-05-19T09:00:00.000Z",
    items: [
      {
        id: "item-1",
        assignmentId: "assignment-1",
        itemType: "listening_recording",
        title: "A Day at the Museum",
        passageText: "I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur. My favorite part was the space room.",
        audioUrl: "/mock-audio/native-sample.m4a",
        audioFileName: "TalkFile_ PH-line-1.m4a",
        orderIndex: 1,
        minRecordingSec: 3,
        maxRecordingSec: 120
      }
    ]
  },
  {
    id: "assignment-2",
    teacherId: "teacher-1",
    classId: "class-b",
    title: "Reading Plus Shadowing 03",
    description: "문장을 듣고 자연스럽게 따라 읽습니다.",
    assignmentType: "listening_recording",
    dueAt: "2026-05-28T14:59:00.000Z",
    status: "published",
    createdAt: "2026-05-21T09:00:00.000Z",
    items: [
      {
        id: "item-2",
        assignmentId: "assignment-2",
        itemType: "listening_recording",
        title: "My Busy Morning",
        passageText: "Every morning, I pack my bag, eat breakfast, and walk to school. I like the quiet streets before the city gets busy.",
        audioUrl: "/mock-audio/native-sample.m4a",
        audioFileName: "TalkFile_ PH-line-1.m4a",
        orderIndex: 1,
        minRecordingSec: 3,
        maxRecordingSec: 90
      }
    ]
  }
];

export const mockSubmissions: Submission[] = [
  {
    id: "submission-1",
    assignmentId: "assignment-1",
    studentId: "student-1",
    status: "submitted",
    submittedAt: "2026-05-22T10:10:00.000Z",
    items: [{ id: "subitem-1", submissionId: "submission-1", assignmentItemId: "item-1", recordingUrl: "/mock-audio/native-sample.m4a", recordingFileName: "jiwoo-unit1.m4a", recordingMimeType: "audio/mp4", recordingDurationSec: 34, fileSizeBytes: 390000 }]
  },
  {
    id: "submission-2",
    assignmentId: "assignment-1",
    studentId: "student-2",
    status: "reviewed",
    submittedAt: "2026-05-22T11:25:00.000Z",
    teacherComment: "발음이 또렷해졌어요. 마지막 문장은 조금 더 천천히 읽어 보세요.",
    reviewedAt: "2026-05-23T01:00:00.000Z",
    items: [{ id: "subitem-2", submissionId: "submission-2", assignmentItemId: "item-1", recordingUrl: "/mock-audio/native-sample.m4a", recordingFileName: "seojun-unit1.m4a", recordingMimeType: "audio/mp4", recordingDurationSec: 41, fileSizeBytes: 420000 }]
  }
];
