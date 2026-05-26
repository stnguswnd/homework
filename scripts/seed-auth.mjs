import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

function loadEnvFile(path) {
  try {
    const env = readFileSync(path, "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^"|"$/g, "");
    }
  } catch {
    // The project can run with either .env or .env.local.
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const iterations = 210000;
  const digest = "sha256";
  const hash = pbkdf2Sync(password, salt, iterations, 32, digest).toString("hex");
  return `pbkdf2$${digest}$${iterations}$${salt}$${hash}`;
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
const shouldSeedDemoData = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_SEED === "true";

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL.");
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.warn("Production mode detected. Demo assignments, targets, submissions, and recordings will not be seeded.");
  console.warn("Set ALLOW_DEMO_SEED=true only when you intentionally want demo data in this database.");
}

const pool = new Pool({ connectionString: databaseUrl });

const users = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    username: "teacher",
    password: "teacher123",
    role: "teacher",
    displayName: "Teacher",
    linkedStudentId: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    username: "student",
    password: "student123",
    role: "student",
    displayName: "Student",
    linkedStudentId: null,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    username: "parent",
    password: "parent123",
    role: "parent",
    displayName: "Parent",
    linkedStudentId: null,
  },
];

const classes = [
  ["class-a", "teacher-1", "월수 Basic Speaking", "Elementary speaking class", "active"],
  ["class-b", "teacher-1", "화목 Reading Plus", "Reading and shadowing class", "active"],
  ["class-c", "teacher-1", "토요 Interview", "Presentation and interview class", "active"],
  ["reading-a", "teacher-1", "Elementary Reading A", "Elementary Reading A class", "active"],
  ["reading-b", "teacher-1", "Elementary Reading B", "Elementary Reading B class", "active"],
  ["middle-speaking", "teacher-1", "Middle School Speaking", "Middle school speaking class", "active"],
];

const students = [
  ["student-1", "22222222-2222-4222-8222-222222222222", "teacher-1", "JIWOO24", "student123", "Jiwoo", "Yonsei Elementary", "G4", "girl-brown", "Quiet voice", "jiwoo-parent", "active"],
  ["student-2", null, "teacher-1", "SEOJUN7", "student123", "Seojun", "Seoul Elementary", "G4", "boy-dark", null, "seojun-parent", "active"],
  ["student-3", null, "teacher-1", "HAYUN9", "student123", "Hayun", "Haneul Elementary", "G5", "girl-red", null, null, "active"],
  ["student-4", null, "teacher-1", "DOYUN1", "student123", "Doyun", "Segak Elementary", "G3", "robot", null, null, "inactive"],
  ["student-5", null, "teacher-1", "ARIN55", "student123", "Arin", "Haneul Elementary", "G4", "girl-black", null, null, "active"],
  ["student-6", null, "teacher-1", "YOOJAE0", "student123", "Yoo Jaeyoung", null, null, "robot", null, null, "active"],
  ["student-7", null, "teacher-1", "SEODO0", "student123", "Seo Doyoon", null, null, "robot", null, null, "active"],
  ["student-8", null, "teacher-1", "KANGJI0", "student123", "Kang Jiwoo", null, null, "robot", null, null, "active"],
  ["student-9", null, "teacher-1", "MOONHA0", "student123", "Moon Harin", null, null, "robot", null, null, "active"],
  ["student-10", null, "teacher-1", "BAEKSE0", "student123", "Baek Seojun", null, null, "robot", null, null, "active"],
  ["student-11", null, "teacher-1", "YOONCH0", "student123", "Yoon Chaewon", null, null, "robot", null, null, "active"],
  ["student-12", null, "teacher-1", "NAMDO0", "student123", "Nam Dohyun", null, null, "robot", null, null, "active"],
  ["student-13", null, "teacher-1", "KIMNA0", "student123", "Kim Naeun", null, null, "robot", null, null, "active"],
  ["student-14", null, "teacher-1", "LEEJIA0", "student123", "Lee Jia", null, null, "robot", null, null, "active"],
  ["student-15", null, "teacher-1", "PARKHY0", "student123", "Park Hyunwoo", null, null, "robot", null, null, "active"],
  ["student-16", null, "teacher-1", "CHOISE0", "student123", "Choi Seoyul", null, null, "robot", null, null, "active"],
  ["student-17", null, "teacher-1", "JUNGMI0", "student123", "Jung Minseo", null, null, "robot", null, null, "active"],
  ["student-18", null, "teacher-1", "OHHA0", "student123", "Oh Hajun", null, null, "robot", null, null, "active"],
  ["student-19", null, "teacher-1", "SONGYE0", "student123", "Song Yerin", null, null, "robot", null, null, "active"],
  ["student-20", null, "teacher-1", "MOONJI0", "student123", "Moon Jiho", null, null, "robot", null, null, "active"],
  ["student-21", null, "teacher-1", "KANGYU0", "student123", "Kang Yunseo", null, null, "robot", null, null, "active"],
  ["student-22", null, "teacher-1", "HANSI0", "student123", "Han Siwoo", null, null, "robot", null, null, "active"],
  ["student-23", null, "teacher-1", "YOOHA0", "student123", "Yoo Haneul", null, null, "robot", null, null, "active"],
  ["student-24", null, "teacher-1", "SEOJI0", "student123", "Seo Jimin", null, null, "robot", null, null, "active"],
  ["student-25", null, "teacher-1", "HONGTA0", "student123", "Hong Taeo", null, null, "robot", null, null, "active"],
  ["student-26", null, "teacher-1", "KWONYE0", "student123", "Kwon Yejun", null, null, "robot", null, null, "active"],
  ["student-27", null, "teacher-1", "LIMSU0", "student123", "Lim Sua", null, null, "robot", null, null, "active"],
  ["student-28", null, "teacher-1", "BAEJI0", "student123", "Bae Jian", null, null, "robot", null, null, "active"],
  ["student-29", null, "teacher-1", "JOEUN0", "student123", "Jo Eunchai", null, null, "robot", null, null, "active"],
  ["student-30", null, "teacher-1", "SHINDO0", "student123", "Shin Doyoon", null, null, "robot", null, null, "active"],
  ["student-31", null, "teacher-1", "KOGO0", "student123", "Ko Yubin", null, null, "robot", null, null, "active"],
  ["student-32", null, "teacher-1", "JANGMI0", "student123", "Jang Minjae", null, null, "robot", null, null, "active"],
  ["student-33", null, "teacher-1", "LEEDO0", "student123", "Lee Dogyeom", null, null, "robot", null, null, "active"],
  ["student-34", null, "teacher-1", "PARKSE0", "student123", "Park Seeun", null, null, "robot", null, null, "active"],
  ["student-35", null, "teacher-1", "CHOIYE0", "student123", "Choi Yeonwoo", null, null, "robot", null, null, "active"],
  ["student-36", null, "teacher-1", "JUNGYU0", "student123", "Jung Yuna", null, null, "robot", null, null, "active"],
  ["student-37", null, "teacher-1", "OHJUN0", "student123", "Oh Junseo", null, null, "robot", null, null, "active"],
  ["student-38", null, "teacher-1", "KIMSE0", "student123", "Kim Seohyun", null, null, "robot", null, null, "active"],
];

const memberships = [
  ["membership-1", "class-a", "student-1"],
  ["membership-2", "class-a", "student-2"],
  ["membership-3", "class-a", "student-3"],
  ["membership-4", "class-b", "student-3"],
  ["membership-5", "class-b", "student-4"],
  ["membership-6", "class-b", "student-5"],
  ["membership-7", "class-a", "student-6"],
  ["membership-8", "class-a", "student-7"],
  ["membership-9", "class-a", "student-8"],
  ["membership-10", "class-a", "student-9"],
  ["membership-11", "class-b", "student-10"],
  ["membership-12", "class-b", "student-11"],
  ["membership-13", "class-b", "student-12"],
  ["membership-14", "reading-a", "student-13"],
  ["membership-15", "reading-a", "student-14"],
  ["membership-16", "reading-a", "student-15"],
  ["membership-17", "reading-a", "student-16"],
  ["membership-18", "reading-a", "student-17"],
  ["membership-19", "reading-a", "student-18"],
  ["membership-20", "reading-a", "student-19"],
  ["membership-21", "reading-a", "student-20"],
  ["membership-22", "reading-a", "student-21"],
  ["membership-23", "reading-a", "student-22"],
  ["membership-24", "reading-b", "student-23"],
  ["membership-25", "reading-b", "student-24"],
  ["membership-26", "reading-b", "student-25"],
  ["membership-27", "reading-b", "student-26"],
  ["membership-28", "reading-b", "student-27"],
  ["membership-29", "reading-b", "student-28"],
  ["membership-30", "reading-b", "student-29"],
  ["membership-31", "reading-b", "student-30"],
  ["membership-32", "reading-b", "student-31"],
  ["membership-33", "middle-speaking", "student-32"],
  ["membership-34", "middle-speaking", "student-33"],
  ["membership-35", "middle-speaking", "student-34"],
  ["membership-36", "middle-speaking", "student-35"],
  ["membership-37", "middle-speaking", "student-36"],
  ["membership-38", "middle-speaking", "student-37"],
  ["membership-39", "middle-speaking", "student-38"],
];

const scheduleDays = [
  ["schedule-class-a-2026-05-25", "class-a", "2026-05-25", true, "16:00", "17:20", "e-future Discovery 4.1", "Unit 1 A Day at the Museum", "Reading and shadowing practice", "Unit 1 vocabulary review"],
  ["schedule-class-b-2026-05-25", "class-b", "2026-05-25", true, "17:30", "18:50", "Reading Plus Starter", "Shadowing 03 Fluency Check", "Sentence shadowing and feedback", "Shadowing 04 preview"],
  ["schedule-reading-a-2026-05-26", "reading-a", "2026-05-26", true, "16:00", "17:20", "Reading A", "Chapter 3 Main Idea", "Find key sentences and summarize", "Workbook p.12"],
  ["schedule-reading-b-2026-05-27", "reading-b", "2026-05-27", true, "16:00", "17:20", "Reading B", "Picture Talk", "Image speaking practice", "Prepare picture description"],
  ["schedule-middle-speaking-2026-05-28", "middle-speaking", "2026-05-28", true, "18:30", "19:50", "Speaking Intermediate", "Interview Practice", "Question and answer practice", "Record answers"],
];

try {
  for (const user of users) {
    await pool.query(
      `
        insert into app_users (id, username, password_hash, role, display_name, linked_student_id)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (username) do update set
          password_hash = excluded.password_hash,
          role = excluded.role,
          display_name = excluded.display_name,
          linked_student_id = excluded.linked_student_id,
          updated_at = now()
      `,
      [user.id, user.username, hashPassword(user.password), user.role, user.displayName, user.linkedStudentId],
    );
  }

  await pool.query(
    `
      insert into teachers (id, app_user_id, email, display_name, role)
      values ('teacher-1', '11111111-1111-4111-8111-111111111111', 'teacher', 'Teacher', 'teacher')
      on conflict (id) do update set
        app_user_id = excluded.app_user_id,
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now()
    `,
  );

  for (const classItem of classes) {
    await pool.query(
      `
        insert into classes (id, teacher_id, name, description, status)
        values ($1, $2, $3, $4, $5)
        on conflict (id) do update set
          teacher_id = excluded.teacher_id,
          name = excluded.name,
          description = excluded.description,
          status = excluded.status,
          updated_at = now()
      `,
      classItem,
    );
  }

  for (const student of students) {
    const [
      id,
      appUserId,
      teacherId,
      studentLoginId,
      plainPassword,
      name,
      schoolName,
      grade,
      avatarKey,
      memo,
      parentId,
      status,
    ] = student;
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    await pool.query(
      `
        insert into students (
          id, app_user_id, teacher_id, student_login_id, password_hash, name, school_name, grade,
          avatar_key, memo, parent_id, status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        on conflict (id) do update set
          app_user_id = excluded.app_user_id,
          teacher_id = excluded.teacher_id,
          student_login_id = excluded.student_login_id,
          password_hash = excluded.password_hash,
          name = excluded.name,
          school_name = excluded.school_name,
          grade = excluded.grade,
          avatar_key = excluded.avatar_key,
          memo = excluded.memo,
          parent_id = excluded.parent_id,
          status = excluded.status,
          updated_at = now()
      `,
      [id, appUserId, teacherId, studentLoginId, passwordHash, name, schoolName, grade, avatarKey, memo, parentId, status],
    );
  }

  for (const membership of memberships) {
    await pool.query(
      `
        insert into class_memberships (id, class_id, student_id)
        values ($1, $2, $3)
        on conflict (class_id, student_id) do nothing
      `,
      membership,
    );
  }

  for (const schedule of scheduleDays) {
    const [id, classId, date, hasClass, startTime, endTime, bookTitle, progressTitle, progressMemo, nextPrep] = schedule;
    await pool.query(
      `
        insert into class_calendar_events (
          id, teacher_id, class_id, event_type, title, description,
          event_date, start_time, end_time, status
        )
        values ($1, 'teacher-1', $2, $3, $4, $5, $6, $7, $8, 'active')
        on conflict (id) do update set
          event_type = excluded.event_type,
          title = excluded.title,
          description = excluded.description,
          event_date = excluded.event_date,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          status = excluded.status,
          updated_at = now()
      `,
      [
        id.replace(/^schedule-/, "event-"),
        classId,
        hasClass ? "class" : "cancelled",
        progressTitle || bookTitle || (hasClass ? "수업" : "휴강"),
        [bookTitle, progressMemo, nextPrep].filter(Boolean).join("\n") || null,
        date,
        startTime,
        endTime,
      ],
    );
  }

  await pool.query(
    `
      update app_users set linked_student_id = 'student-1', updated_at = now()
      where username in ('student', 'parent')
    `,
  );

  if (shouldSeedDemoData) {
    console.warn("Seeding demo assignments, targets, submissions, and recording metadata. Existing rows with the same ids may be updated.");

    await pool.query(
      `
        insert into assignments (id, teacher_id, class_id, title, description, assignment_type, assignment_subject, due_at, status)
        values
          ('assignment-1', 'teacher-1', 'class-a', 'Discovery Unit 1 Speaking Homework', 'Listen and record the passage.', 'listening_recording', 'Phonics', '2026-05-25T14:59:00.000Z', 'published'),
          ('assignment-2', 'teacher-1', 'class-b', 'Reading Plus Shadowing 03', 'Practice natural sentence shadowing.', 'listening_recording', 'Phonics', '2026-05-28T14:59:00.000Z', 'published'),
          ('assignment-3', 'teacher-1', 'reading-a', 'Elementary Reading A Listening Practice', 'Listen to the passage and complete the homework.', 'listening', 'Phonics', '2026-05-30T14:59:00.000Z', 'published'),
          ('assignment-4', 'teacher-1', 'class-a', '4 Paragraph Weekend Writing', 'Write about your weekend and get AI feedback.', 'writing', 'Phonics', '2026-05-31T14:59:00.000Z', 'published'),
          ('assignment-5', 'teacher-1', 'class-a', 'Unit 3 Vocabulary Sentence Writing', 'Write a sentence using a given vocabulary.', 'vocabulary_example', 'SL', '2026-06-01T14:59:00.000Z', 'published'),
          ('assignment-6', 'teacher-1', 'class-a', 'Unit 3 Vocabulary Reading', 'Read out loud and record.', 'vocabulary_recording', 'SL', '2026-06-02T14:59:00.000Z', 'published'),
          ('hw_1', 'teacher-1', null, 'Discovery Unit 1 Speaking Homework', 'Listen and record the passage.', 'listening_recording', 'Phonics', null, 'draft'),
          ('hw_2', 'teacher-1', null, 'Reading Plus Shadowing 03', 'Practice natural sentence shadowing.', 'listening_recording', 'Phonics', null, 'draft'),
          ('hw_3', 'teacher-1', null, 'Listening Completion Practice', 'Listen to the MP3 and mark the homework complete.', 'listening', 'Phonics', null, 'draft'),
          ('hw_4', 'teacher-1', null, '4 Paragraph Writing Practice', 'Write, receive AI feedback, revise, and submit.', 'writing', 'Phonics', null, 'draft'),
          ('hw_5', 'teacher-1', null, 'Unit 3 Vocabulary Sentence Writing', 'Write a sentence using a given vocabulary.', 'vocabulary_example', 'SL', null, 'draft'),
          ('hw_6', 'teacher-1', null, 'Unit 3 Vocabulary Reading', 'Read out loud and record.', 'vocabulary_recording', 'SL', null, 'draft')
        on conflict (id) do update set
          title = excluded.title,
          description = excluded.description,
          assignment_type = excluded.assignment_type,
          assignment_subject = excluded.assignment_subject,
          due_at = excluded.due_at,
          status = excluded.status,
          updated_at = now()
      `,
    );

    await pool.query(
      `
        insert into assignment_items (
          id, assignment_id, item_type, title, passage_text, audio_url,
          audio_file_name, order_index, min_recording_sec, max_recording_sec,
          writing_mode, writing_unit, writing_unit_count, prompt_text, writing_instructions, writing_hint, writing_example
        )
        values
          ('item-1', 'assignment-1', 'listening_recording', 'A Day at the Museum', 'I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur.', '/mock-audio/native-sample.m4a', 'native-sample.m4a', 1, 3, 120, null, null, 4, null, null, null, null),
          ('item-2', 'assignment-2', 'listening_recording', 'My Busy Morning', 'Every morning, I pack my bag, eat breakfast, and walk to school.', '/mock-audio/native-sample.m4a', 'native-sample.m4a', 1, 3, 90, null, null, 4, null, null, null, null),
          ('item-3', 'assignment-3', 'listening', 'Reading A Audio Check', 'Listen carefully and complete the homework after the audio ends.', '/mock-audio/native-sample.m4a', 'native-sample.m4a', 1, 0, 0, null, null, 4, null, null, null, null),
          ('item-4', 'assignment-4', 'writing_prompt', 'Weekend Writing', null, null, null, 1, 0, 0, 'topic_diary', 'paragraphs', 4, 'Write about your weekend.', 'Use past tense and write clearly.', 'Think about where you went, what you did, and how you felt.', 'I went to the park with my family. We played soccer and ate lunch together. I felt happy because the weather was sunny.'),
          ('item-5', 'assignment-5', 'vocabulary_example', 'Vocabulary Sentence Writing', null, null, null, 1, 0, 0, null, null, 4, 'Write a sentence using a given vocabulary.', 'Use one complete English sentence for each word.', 'Think about the word meaning before writing.', 'I read a book in the library.'),
          ('item-6', 'assignment-6', 'vocabulary_recording', 'Vocabulary Reading', null, null, null, 1, 10, 120, null, null, 4, 'Read out loud and record.', 'Read every word in order and speak clearly.', null, null),
          ('hw_1-item-1', 'hw_1', 'listening_recording', 'A Day at the Museum', 'I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur.', null, null, 1, 3, 120, null, null, 4, null, null, null, null),
          ('hw_2-item-1', 'hw_2', 'listening_recording', 'My Busy Morning', 'Every morning, I pack my bag, eat breakfast, and walk to school.', null, null, 1, 3, 90, null, null, 4, null, null, null, null),
          ('hw_3-item-1', 'hw_3', 'listening', 'Listening Completion', 'Listen to the MP3 and complete the homework.', null, null, 1, 0, 0, null, null, 4, null, null, null, null),
          ('hw_4-item-1', 'hw_4', 'writing_prompt', 'Writing Prompt', null, null, null, 1, 0, 0, 'topic_diary', 'paragraphs', 4, 'Write about your favorite food.', 'Write simple and complete sentences.', 'Use because to explain your reason.', 'My favorite food is pizza because it is cheesy and delicious.'),
          ('hw_5-item-1', 'hw_5', 'vocabulary_example', 'Vocabulary Sentence Writing', null, null, null, 1, 0, 0, null, null, 4, 'Write a sentence using a given vocabulary.', 'Use one complete English sentence for each word.', 'Think about the word meaning before writing.', 'I read a book in the library.'),
          ('hw_6-item-1', 'hw_6', 'vocabulary_recording', 'Vocabulary Reading', null, null, null, 1, 10, 120, null, null, 4, 'Read out loud and record.', 'Read every word in order and speak clearly.', null, null)
        on conflict (id) do update set
          item_type = excluded.item_type,
          title = excluded.title,
          passage_text = excluded.passage_text,
          audio_url = excluded.audio_url,
          audio_file_name = excluded.audio_file_name,
          min_recording_sec = excluded.min_recording_sec,
          max_recording_sec = excluded.max_recording_sec,
          writing_mode = excluded.writing_mode,
          writing_unit = excluded.writing_unit,
          writing_unit_count = excluded.writing_unit_count,
          prompt_text = excluded.prompt_text,
          writing_instructions = excluded.writing_instructions,
          writing_hint = excluded.writing_hint,
          writing_example = excluded.writing_example,
          updated_at = now()
      `,
    );

    await pool.query(
      `
        insert into assignment_vocabulary_items (id, assignment_id, word, meaning, order_index)
        values
          ('vocab-5-1', 'assignment-5', 'apple', '사과', 0),
          ('vocab-5-2', 'assignment-5', 'library', '도서관', 1),
          ('vocab-5-3', 'assignment-5', 'happy', '행복한', 2),
          ('vocab-5-4', 'assignment-5', 'mountain', '산', 3),
          ('vocab-5-5', 'assignment-5', 'teacher', '선생님', 4),
          ('vocab-5-6', 'assignment-5', 'picture', '사진', 5),
          ('vocab-6-1', 'assignment-6', 'apple', '사과', 0),
          ('vocab-6-2', 'assignment-6', 'library', '도서관', 1),
          ('vocab-6-3', 'assignment-6', 'happy', '행복한', 2),
          ('vocab-6-4', 'assignment-6', 'mountain', '산', 3),
          ('vocab-6-5', 'assignment-6', 'teacher', '선생님', 4),
          ('vocab-6-6', 'assignment-6', 'picture', '사진', 5),
          ('vocab-6-7', 'assignment-6', 'hungry', '배고픈', 6),
          ('vocab-6-8', 'assignment-6', 'quickly', '빠르게', 7),
          ('vocab-hw-5-1', 'hw_5', 'apple', '사과', 0),
          ('vocab-hw-5-2', 'hw_5', 'library', '도서관', 1),
          ('vocab-hw-5-3', 'hw_5', 'happy', '행복한', 2),
          ('vocab-hw-6-1', 'hw_6', 'apple', '사과', 0),
          ('vocab-hw-6-2', 'hw_6', 'library', '도서관', 1),
          ('vocab-hw-6-3', 'hw_6', 'happy', '행복한', 2)
        on conflict (id) do update set
          word = excluded.word,
          meaning = excluded.meaning,
          order_index = excluded.order_index,
          updated_at = now()
      `,
    );

    await pool.query(
      `
        insert into assignment_targets (id, assignment_id, class_id, student_id, status, due_at, submitted_at, reviewed)
        values
          ('target-1', 'assignment-1', 'class-a', 'student-1', 'submitted', '2026-05-25T14:59:00.000Z', '2026-05-22T10:10:00.000Z', false),
          ('target-2', 'assignment-1', 'class-a', 'student-2', 'submitted', '2026-05-25T14:59:00.000Z', '2026-05-22T11:25:00.000Z', true),
          ('target-3', 'assignment-1', 'class-a', 'student-3', 'assigned', '2026-05-25T14:59:00.000Z', null, false),
          ('target-6', 'assignment-1', 'class-a', 'student-6', 'assigned', '2026-05-25T14:59:00.000Z', null, false),
          ('target-7', 'assignment-1', 'class-a', 'student-7', 'assigned', '2026-05-25T14:59:00.000Z', null, false),
          ('target-8', 'assignment-1', 'class-a', 'student-8', 'assigned', '2026-05-25T14:59:00.000Z', null, false),
          ('target-9', 'assignment-1', 'class-a', 'student-9', 'assigned', '2026-05-25T14:59:00.000Z', null, false),
          ('target-4', 'assignment-2', 'class-b', 'student-3', 'assigned', '2026-05-28T14:59:00.000Z', null, false),
          ('target-5', 'assignment-2', 'class-b', 'student-5', 'assigned', '2026-05-28T14:59:00.000Z', null, false),
          ('target-10', 'assignment-2', 'class-b', 'student-10', 'assigned', '2026-05-28T14:59:00.000Z', null, false),
          ('target-11', 'assignment-2', 'class-b', 'student-11', 'assigned', '2026-05-28T14:59:00.000Z', null, false),
          ('target-12', 'assignment-2', 'class-b', 'student-12', 'assigned', '2026-05-28T14:59:00.000Z', null, false),
          ('target-13', 'assignment-3', 'reading-a', 'student-13', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-14', 'assignment-3', 'reading-a', 'student-14', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-15', 'assignment-3', 'reading-a', 'student-15', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-16', 'assignment-3', 'reading-a', 'student-16', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-17', 'assignment-3', 'reading-a', 'student-17', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-18', 'assignment-3', 'reading-a', 'student-18', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-19', 'assignment-3', 'reading-a', 'student-19', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-20', 'assignment-3', 'reading-a', 'student-20', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-21', 'assignment-3', 'reading-a', 'student-21', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-22', 'assignment-3', 'reading-a', 'student-22', 'assigned', '2026-05-30T14:59:00.000Z', null, false),
          ('target-23', 'assignment-4', 'class-a', 'student-1', 'assigned', '2026-05-31T14:59:00.000Z', null, false),
          ('target-24', 'assignment-4', 'class-a', 'student-2', 'assigned', '2026-05-31T14:59:00.000Z', null, false),
          ('target-25', 'assignment-4', 'class-a', 'student-3', 'assigned', '2026-05-31T14:59:00.000Z', null, false),
          ('target-26', 'assignment-5', 'class-a', 'student-1', 'assigned', '2026-06-01T14:59:00.000Z', null, false),
          ('target-27', 'assignment-5', 'class-a', 'student-2', 'assigned', '2026-06-01T14:59:00.000Z', null, false),
          ('target-28', 'assignment-5', 'class-a', 'student-3', 'assigned', '2026-06-01T14:59:00.000Z', null, false),
          ('target-29', 'assignment-6', 'class-a', 'student-1', 'assigned', '2026-06-02T14:59:00.000Z', null, false),
          ('target-30', 'assignment-6', 'class-a', 'student-2', 'assigned', '2026-06-02T14:59:00.000Z', null, false),
          ('target-31', 'assignment-6', 'class-a', 'student-3', 'assigned', '2026-06-02T14:59:00.000Z', null, false)
        on conflict (assignment_id, student_id) do update set
          class_id = excluded.class_id,
          status = excluded.status,
          due_at = excluded.due_at,
          submitted_at = excluded.submitted_at,
          reviewed = excluded.reviewed,
          cancelled_at = null,
          cancelled_by = null,
          updated_at = now()
      `,
    );

    await pool.query(
      `
        insert into submissions (id, assignment_id, student_id, assignment_target_id, status, submitted_at, teacher_comment, reviewed_at)
        values
          ('submission-1', 'assignment-1', 'student-1', 'target-1', 'submitted', '2026-05-22T10:10:00.000Z', null, null),
          ('submission-2', 'assignment-1', 'student-2', 'target-2', 'reviewed', '2026-05-22T11:25:00.000Z', 'Good pronunciation. Try reading the last sentence more slowly.', '2026-05-23T01:00:00.000Z')
        on conflict (assignment_id, student_id) do update set
          status = excluded.status,
          submitted_at = excluded.submitted_at,
          teacher_comment = excluded.teacher_comment,
          reviewed_at = excluded.reviewed_at,
          updated_at = now()
      `,
    );

    await pool.query(
      `
        insert into submission_items (
          id, submission_id, assignment_item_id, recording_url, recording_file_name,
          recording_mime_type, recording_duration_sec, file_size_bytes
        )
        values
          ('subitem-1', 'submission-1', 'item-1', '/mock-audio/native-sample.m4a', 'jiwoo-unit1.m4a', 'audio/mp4', 34, 390000),
          ('subitem-2', 'submission-2', 'item-1', '/mock-audio/native-sample.m4a', 'seojun-unit1.m4a', 'audio/mp4', 41, 420000)
        on conflict (submission_id, assignment_item_id) do update set
          recording_url = excluded.recording_url,
          recording_file_name = excluded.recording_file_name,
          recording_mime_type = excluded.recording_mime_type,
          recording_duration_sec = excluded.recording_duration_sec,
          file_size_bytes = excluded.file_size_bytes,
          updated_at = now()
      `,
    );
  }

  console.log("Schema applied and seed data inserted.");
  console.log("Seeded auth users:");
  for (const user of users) {
    console.log(`- ${user.username} / ${user.password} (${user.role})`);
  }
} finally {
  await pool.end();
}
