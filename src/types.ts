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
        title: "Dialogues",
        items: [{ id: "nc_dialogues", label: "Dialogues" }]
      },
      {
        title: "Grammar",
        items: [{ id: "nc_grammar", label: "Grammar" }]
      },
      {
        title: "Reading연습문제",
        items: [{ id: "nc_read_prac", label: "Reading연습문제" }]
      },
      {
        title: "Reading실전문제",
        items: [{ id: "nc_read_real", label: "Reading실전문제" }]
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
        title: 'word test',
        items: [
          { id: 'word_1', label: '뜻시험' },
          { id: 'word_2', label: '영어시험' },
          { id: 'word_3', label: '예문시험' },
          { id: 'word_4', label: '영영풀이' },
          { id: 'word_5', label: '다의어' },
        ]
      },
      {
        title: '본문 & 내용이해',
        items: [
          { id: 'textbook', label: '본문학습' },
          { id: 'comprehension', label: '내용이해 T/F' },
          { id: 'workbook_3', label: 'Part 3 동사형' },
          { id: 'workbook_4', label: 'Part 4 어법' },
          { id: 'workbook_6', label: 'Part 6 순서배열' },
          { id: 'workbook_7', label: 'Part 7 영작' },
        ]
      },
      {
        title: '형성평가',
        items: [
          { id: 'eval_0', label: '0단계 pre-step' },
          { id: 'eval_1', label: '1단계 BASIC' },
          { id: 'eval_2', label: '2단계 ACTUAL' },
        ]
      },
      {
        title: 'GRAMMAR BUILD UP',
        items: [
          { id: 'grammar_subj', label: '주관식' },
          { id: 'grammar_obj', label: '객관식' },
        ]
      },
      {
        title: 'FINAL',
        items: [
          { id: 'final', label: '내신기출FINAL' },
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
