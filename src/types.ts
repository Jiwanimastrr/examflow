export type ProgressState = {
  isChecked: boolean;
  updatedBy: string;
  updatedAt: number;
};

export type ProgressRecord = Record<string, ProgressState>;

export interface StudentProgress {
  isChecked: boolean;
  updatedBy?: string;
  updatedAt?: number;
}

export interface StudentComment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  readBy?: string[];
}

export interface StudentCustomTask {
  id: string;
  label: string;
  lesson?: string;
}

export interface Student {
  id: string;
  name: string;
  school: string;
  grade: string;
  studentClass?: string;
  progress: Record<string, StudentProgress>;
  comments?: StudentComment[];
  assignedItems?: string[]; // Array of checklist item IDs the student needs to complete
  customTasks?: StudentCustomTask[]; // Array of unique tasks created by the teacher
}

export interface LoginRecord {
  id: string;
  name: string;
  timestamp: number;
  action?: string; // Describes what the user did (e.g., '로그인', '진행도 업데이트' 등)
}

export interface SchoolExamDate {
  school: string;
  grade: string;
  startDateStr: string; // MM-DD format
  endDateStr: string; // MM-DD format
}

export interface ChecklistCategory {
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ExamMaterial {
  title: string;
  categories: ChecklistCategory[];
}

export const SCHOOLS = ["전체", "태전중", "광남중", "매양중", "경안중", "탄벌중", "오포중"];
export const GRADES = ["전체", "1학년", "2학년", "3학년"];
export const LESSONS = ["1과", "2과", "3과", "4과", "5과", "6과", "7과", "8과", "Special 1", "Special 2"];

export const EXAM_MATERIALS: ExamMaterial[] = [
  {
    title: "내신콘서트",
    categories: [
      {
        title: "word",
        items: [{ id: "nc_word", label: "word" }]
      },
      {
        title: "dialog",
        items: [{ id: "nc_dialogues", label: "dialog" }]
      },
      {
        title: "grammar",
        items: [{ id: "nc_grammar", label: "grammar" }]
      },
      {
        title: "Reading연습문제",
        items: [{ id: "nc_read_prac", label: "Reading연습문제" }]
      },
      {
        title: "Reading 실전문제",
        items: [{ id: "nc_read_real", label: "Reading 실전문제" }]
      },
      {
        title: "실전모의고사 Basic1",
        items: [{ id: "nc_mock_b1", label: "실전모의고사 Basic1" }]
      },
      {
        title: "실전모의고사 Basic2",
        items: [{ id: "nc_mock_b2", label: "실전모의고사 Basic2" }]
      },
      {
        title: "실전모의고사 intermediate1",
        items: [{ id: "nc_mock_i1", label: "실전모의고사 intermediate1" }]
      },
      {
        title: "실전모의고사 intermediate2",
        items: [{ id: "nc_mock_i2", label: "실전모의고사 intermediate2" }]
      },
      {
        title: "서술형",
        items: [{ id: "nc_essay", label: "서술형" }]
      },
      {
        title: "실전모의고사 Advanced",
        items: [{ id: "nc_mock_adv", label: "실전모의고사 Advanced" }]
      }
    ]
  },
  {
    title: "백발백중",
    categories: [
      {
        title: "Vocabulary",
        items: [{ id: "100_vocab", label: "Vocabulary" }]
      },
      {
        title: "Dialog",
        items: [{ id: "100_dialog", label: "Dialog" }]
      },
      {
        title: "Grammar 확인문제",
        items: [{ id: "100_grammar_check", label: "Grammar 확인문제" }]
      },
      {
        title: "Grammar 실전문제",
        items: [{ id: "100_grammar_real", label: "Grammar 실전문제" }]
      },
      {
        title: "Grammar 심화문제",
        items: [{ id: "100_grammar_adv", label: "Grammar 심화문제" }]
      },
      {
        title: "Reading 내용확인, 적절어휘/어법 고르기",
        items: [{ id: "100_read_check", label: "Reading 내용확인, 적절어휘/어법 고르기" }]
      },
      {
        title: "Reading 순서배열/영작",
        items: [{ id: "100_read_order", label: "Reading 순서배열/영작" }]
      },
      {
        title: "Reading 실전문제",
        items: [{ id: "100_read_real", label: "Reading 실전문제" }]
      },
      {
        title: "Reading 심화문제",
        items: [{ id: "100_read_adv", label: "Reading 심화문제" }]
      },
      {
        title: "기타지문",
        items: [{ id: "100_other", label: "기타지문" }]
      },
      {
        title: "서술형끝내기",
        items: [{ id: "100_essay", label: "서술형끝내기" }]
      },
      {
        title: "100발100중모의고사",
        items: [{ id: "100_mock", label: "100발100중모의고사" }]
      },
      {
        title: "고득점모의고사",
        items: [{ id: "100_high_mock", label: "고득점모의고사" }]
      }
    ]
  },
  {
    title: "백발백중 부록 X10",
    categories: [
      {
        title: "어휘확인문제",
        items: [{ id: "x10_vocab", label: "어휘확인문제" }]
      },
      {
        title: "핵심문장 review",
        items: [{ id: "x10_sentence", label: "핵심문장 review" }]
      },
      {
        title: "최종점검모의고사",
        items: [{ id: "x10_final_mock", label: "최종점검모의고사" }]
      }
    ]
  },
  {
    title: "exam4you",
    categories: [
      {
        title: "01. 예상문제",
        items: [
          { id: "e4_expected_pre", label: "예상문제 PRE-STEP" },
          { id: "e4_expected_1", label: "예상문제 1회" },
          { id: "e4_expected_2", label: "예상문제 2회" },
        ]
      },
      {
        title: "02. 교과서본문",
        items: [
          { id: "e4_textbook", label: "본문" },
        ]
      },
      {
        title: "03. word test",
        items: [
          { id: "e4_word_1", label: "뜻시험" },
          { id: "e4_word_2", label: "영어시험" },
          { id: "e4_word_3", label: "알맞은 영어단어 넣기(예문)" },
          { id: "e4_word_4", label: "영영풀이" },
          { id: "e4_word_5", label: "다의어" },
        ]
      },
      {
        title: "04. 내용정리 플러스",
        items: [
          { id: "e4_content_1", label: "Dialogue - 표현점검(알맞은 단어넣기 / 고르기)" },
          { id: "e4_content_2", label: "Dialogue - 내용점검(T/F, 알맞은 단어 고르기)" },
          { id: "e4_content_3", label: "Dialogue - 빈칸완성(단어 채우기)" },
          { id: "e4_content_4", label: "본문 - 내용점검" },
          { id: "e4_content_5", label: "본문 - 빈칸완성(단어 채우기)" },
          { id: "e4_content_6", label: "본문 - 어법점검(어색한 부분찾아 고치기 / 일치하지 않는곳 찾아 고치기)" },
        ]
      },
      {
        title: "05. 본문 10단계 워크북",
        items: [
          { id: "e4_wb_all", label: "본문 10단계 워크북 통합본(1~10)" },
          { id: "e4_wb_1", label: "본문 10단계 워크북 1_본문해석시_단계별" },
          { id: "e4_wb_2", label: "본문 10단계 워크북 2_빈칸연습 (우리말)_단계별" },
          { id: "e4_wb_3", label: "본문 10단계 워크북 3_빈칸연습 (영어)_단계별" },
          { id: "e4_wb_4", label: "본문 10단계 워크북 4_해석연습_단계별" },
          { id: "e4_wb_5", label: "본문 10단계 워크북 _동사형 연습_단계별" },
          { id: "e4_wb_6", label: "본문 10단계 워크북 6_어법 선택형 연습_단계별" },
          { id: "e4_wb_7", label: "본문 10단계 워크북 7_어색한 곳 찾기 연습_단계별" },
        ]
      },
      {
        title: "06. Grammar build up",
        items: [
          { id: "e4_grammar_wb", label: "워크북" },
          { id: "e4_grammar_obj", label: "객관식" },
          { id: "e4_grammar_subj", label: "주관식" },
        ]
      }
    ]
  },
  {
    title: "족보",
    categories: [
      {
        title: "교과서 문법 공략 1회차",
        items: [{ id: "jokbo_grammar_1", label: "교과서 문법 공략 1회차" }]
      },
      {
        title: "단원별 학습 - 본문 N제",
        items: [{ id: "jokbo_textbook", label: "단원별 학습 - 본문 N제" }]
      },
      {
        title: "1회차. 1~25번",
        items: [{ id: "jokbo_1", label: "1회차. 1~25번" }]
      },
      {
        title: "2회차. 26~50번",
        items: [{ id: "jokbo_2", label: "2회차. 26~50번" }]
      },
      {
        title: "3회차. 51~75번",
        items: [{ id: "jokbo_3", label: "3회차. 51~75번" }]
      },
      {
        title: "4회차. 76~100번",
        items: [{ id: "jokbo_4", label: "4회차. 76~100번" }]
      },
      {
        title: "5회차. 101~125번",
        items: [{ id: "jokbo_5", label: "5회차. 101~125번" }]
      },
      {
        title: "최다빈출 공략 1회차",
        items: [{ id: "jokbo_freq_1", label: "최다빈출 공략 1회차" }]
      },
      {
        title: "최다빈출 공략 2회차",
        items: [{ id: "jokbo_freq_2", label: "최다빈출 공략 2회차" }]
      },
      {
        title: "최다빈출 공략 3회차",
        items: [{ id: "jokbo_freq_3", label: "최다빈출 공략 3회차" }]
      },
      {
        title: "최다오답 공략 1회차",
        items: [{ id: "jokbo_wrong_1", label: "최다오답 공략 1회차" }]
      }
    ]
  }
];

export const ALL_CHECKLIST_ITEMS = EXAM_MATERIALS.flatMap(mat => mat.categories.flatMap(cat => cat.items));

// Backward compatibility or for generic uses if needed:
export const CHECKLIST_CATEGORIES = EXAM_MATERIALS.find(m => m.title === "exam4you")!.categories;
