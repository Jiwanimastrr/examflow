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
}

export interface Student {
  id: string;
  name: string;
  school: string;
  grade: string;
  progress: Record<string, StudentProgress>;
  comments?: StudentComment[];
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

export const SCHOOLS = ["전체", "태전중", "광남중", "매양중", "경안중", "탄벌중", "오포중"];
export const GRADES = ["전체", "1학년", "2학년", "3학년"];

// 이그잼포유 내신대비 과정
export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    title: 'Word Test',
    items: [
      { id: 'word_1', label: '1.뜻시험' },
      { id: 'word_2', label: '2.영어시험' },
      { id: 'word_3', label: '3.예문시험' },
      { id: 'word_4', label: '4.영영풀이' },
      { id: 'word_5', label: '5.다의어' },
    ]
  },
  {
    title: '본문 & 내용이해',
    items: [
      { id: 'textbook', label: '본문학습' },
      { id: 'comprehension', label: '내용이해 T/F' },
      { id: 'workbook_3', label: 'part3 동사형' },
      { id: 'workbook_4', label: 'part4 어법' },
      { id: 'workbook_6', label: 'part6 순서배열' },
      { id: 'workbook_7', label: 'part7 영작' },
    ]
  },
  {
    title: '형성평가',
    items: [
      { id: 'eval_0', label: '0단계 pre-step' },
      { id: 'eval_1', label: '1단계 basic' },
      { id: 'eval_2', label: '2단계 actual' },
    ]
  },
  {
    title: 'Grammar Build up',
    items: [
      { id: 'grammar_subj', label: '주관식' },
      { id: 'grammar_obj', label: '객관식' },
    ]
  },
  {
    title: 'Final',
    items: [
      { id: 'final', label: '내신기출Final' },
    ]
  }
];

export const ALL_CHECKLIST_ITEMS = CHECKLIST_CATEGORIES.flatMap(cat => cat.items);
