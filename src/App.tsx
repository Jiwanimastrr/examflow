import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Student, LoginRecord, SchoolExamDate, StudentComment } from './types';
import { EXAM_MATERIALS, ALL_CHECKLIST_ITEMS, SCHOOLS, GRADES, LESSONS } from './types';
import './index.css';

const parseStoredDate = (str: string) => {
  if (!str) return { m: '', d: '' };
  const parts = str.split('-');
  if (parts.length === 3) return { m: parts[1], d: parts[2] };
  if (parts.length === 2) return { m: parts[0], d: parts[1] };
  return { m: '', d: '' };
};

const MonthDayInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const { m, d } = parseStoredDate(value);
  return (
    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flex: 1 }}>
      <input 
        type="text" 
        maxLength={2} 
        placeholder="월" 
        className="input" 
        style={{ width: '4rem', textAlign: 'center', padding: '0.4rem' }} 
        value={m} 
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          onChange(`${val}-${d}`);
        }} 
        onBlur={(e) => {
          let val = e.target.value;
          if (val.length === 1 && val !== '0') val = `0${val}`;
          onChange(`${val}-${d}`);
        }}
      />
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>월</span>
      <input 
        type="text" 
        maxLength={2} 
        placeholder="일" 
        className="input" 
        style={{ width: '4rem', textAlign: 'center', padding: '0.4rem' }} 
        value={d} 
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          onChange(`${m}-${val}`);
        }} 
        onBlur={(e) => {
          let val = e.target.value;
          if (val.length === 1 && val !== '0') val = `0${val}`;
          onChange(`${m}-${val}`);
        }}
      />
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>일</span>
    </div>
  );
};

function App() {
  const [activeMaterialId, setActiveMaterialId] = useState(EXAM_MATERIALS[0].title);
  const [activeLesson, setActiveLesson] = useState(LESSONS[0]);
  const [currentUser, setCurrentUser] = useState('');
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [examDates, setExamDates] = useState<SchoolExamDate[]>([]);
  const [showExamDateModal, setShowExamDateModal] = useState(false);
  const [showLoginHistoryModal, setShowLoginHistoryModal] = useState(false);
  const [selectedHistoryTeacher, setSelectedHistoryTeacher] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  
  // Edit Student States
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentSchool, setEditStudentSchool] = useState('');
  const [editStudentGrade, setEditStudentGrade] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');
  const [editStudentAssignedItems, setEditStudentAssignedItems] = useState<string[]>([]);
  const [editPopupPosition, setEditPopupPosition] = useState<{ top: number, left: number } | null>(null);
  const [editPopupLesson, setEditPopupLesson] = useState(LESSONS[0]);

  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkAddInput, setBulkAddInput] = useState('');

  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignSelectedStudents, setBulkAssignSelectedStudents] = useState<string[]>([]);
  const [bulkAssignLesson, setBulkAssignLesson] = useState(LESSONS[0]);
  const [bulkAssignSelectedItems, setBulkAssignSelectedItems] = useState<string[]>([]);
  const [bulkAssignSchoolFilter, setBulkAssignSchoolFilter] = useState('전체');
  const [bulkAssignGradeFilter, setBulkAssignGradeFilter] = useState('전체');
  const [bulkAssignClassFilter, setBulkAssignClassFilter] = useState('전체');
  const [bulkAssignNewCustomTask, setBulkAssignNewCustomTask] = useState('');
  const [bulkAssignCustomTasksList, setBulkAssignCustomTasksList] = useState<{id: string, label: string}[]>([]);

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSchool, setNewStudentSchool] = useState(SCHOOLS[1]); // default to first real school
  const [newStudentGrade, setNewStudentGrade] = useState(GRADES[1]); // default to first real grade
  const [newStudentClass, setNewStudentClass] = useState('');
  
  const [newCustomTask, setNewCustomTask] = useState("");
  const [editStudentCustomTasks, setEditStudentCustomTasks] = useState<{id: string, label: string, lesson?: string}[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState(SCHOOLS[0]); // default '전체'
  const [filterGrade, setFilterGrade] = useState(GRADES[0]); // default '전체'
  const [filterClass, setFilterClass] = useState('전체');

  const [selectedStudentIdForComments, setSelectedStudentIdForComments] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Print Report States
  const [printStudentId, setPrintStudentId] = useState<string | null>(null);
  const [printSpeed, setPrintSpeed] = useState<string>('보통');
  const [printComment, setPrintComment] = useState<string>('');

  // Firestore realtime listeners
  useEffect(() => {
    // Listen to students
    const unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studs: Student[] = [];
      snapshot.forEach(docSnap => studs.push(docSnap.data() as Student));
      setStudents(studs);
    });

    // Listen to login history
    const unsubscribeHistory = onSnapshot(collection(db, 'login_history'), (snapshot) => {
      const history: LoginRecord[] = [];
      snapshot.forEach(docSnap => history.push(docSnap.data() as LoginRecord));
      history.sort((a, b) => b.timestamp - a.timestamp);
      setLoginHistory(history);
    });

    // Listen to exam dates
    const unsubscribeExamDates = onSnapshot(collection(db, 'exam_dates'), (snapshot) => {
      const dates: SchoolExamDate[] = [];
      snapshot.forEach(docSnap => dates.push(docSnap.data() as SchoolExamDate));
      setExamDates(dates);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeHistory();
      unsubscribeExamDates();
    };
  }, []);

  const teacherTasksCategoryItems = React.useMemo(() => {
    const items: { id: string, label: string }[] = [];
    const seenIds = new Set<string>();
    students.forEach(student => {
      (student.customTasks || []).forEach(task => {
        if (task.label.toUpperCase() === 'SMOOTH VOCAB') return;
        const tLesson = task.lesson || '1과';
        if (tLesson === activeLesson && !seenIds.has(task.id)) {
          seenIds.add(task.id);
          items.push(task);
        }
      });
    });
    return items;
  }, [students, activeLesson]);

  const ALL_MATERIALS = React.useMemo(() => {
    const teacherMaterial = {
      title: "선생님 과제",
      categories: [
        {
          title: "개별 할당 과제",
          items: teacherTasksCategoryItems
        }
      ]
    };
    return [...EXAM_MATERIALS, teacherMaterial];
  }, [teacherTasksCategoryItems]);

  const logActivity = async (user: string, actionDesc: string) => {
    try {
      const newRecord: LoginRecord = {
        id: crypto.randomUUID(),
        name: user,
        timestamp: Date.now(),
        action: actionDesc
      };
      await setDoc(doc(db, 'login_history', newRecord.id), newRecord);
    } catch (e) {
      console.warn("Failed to log activity", e);
    }
  };

  const handleBulkAddStudents = async () => {
    if (!bulkAddInput.trim()) return;
    
    const lines = bulkAddInput.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    if (!window.confirm(`총 ${lines.length}명의 학생을 일괄 등록하시겠습니까?`)) return;

    try {
      const batch = writeBatch(db);
      let addedCount = 0;

      for (const line of lines) {
        const parts = line.trim().split(/[\s,]+/).filter(Boolean);
        if (parts.length < 1) continue;
        
        const name = parts[0];
        const school = parts.length > 1 ? parts[1] : SCHOOLS[1];
        const grade = parts.length > 2 ? parts[2] : GRADES[1];
        const studentClass = parts.length > 3 ? parts.slice(3).join(' ') : ''; 

        const newId = crypto.randomUUID();
        const newStudent: Student = {
          id: newId,
          name,
          school,
          grade,
          studentClass,
          progress: {},
          assignedItems: LESSONS.flatMap(l => ALL_CHECKLIST_ITEMS.map(i => `${l}_${i.id}`)),
        };

        const docRef = doc(db, 'students', newId);
        batch.set(docRef, newStudent);
        addedCount++;
      }

      await batch.commit();
      logActivity(currentUser, `학생 ${addedCount}명 일괄 등록`);
      setBulkAddInput('');
      setShowBulkAddModal(false);
      alert(`${addedCount}명의 학생이 추가되었습니다.`);
    } catch (error) {
      console.error("Error in bulk add students:", error);
      alert("학생 일괄 등록 중 오류가 발생했습니다.");
    }
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStudentName.trim();
    if (!name) return;

    const newId = crypto.randomUUID();
    const newStudent: Student = {
      id: newId,
      name,
      school: newStudentSchool,
      grade: newStudentGrade,
      studentClass: newStudentClass.trim(),
      progress: {},
      assignedItems: LESSONS.flatMap(l => ALL_CHECKLIST_ITEMS.map(i => `${l}_${i.id}`)),
    };

    try {
      await setDoc(doc(db, 'students', newId), newStudent);
      setNewStudentName('');
      setNewStudentClass('');
      logActivity(currentUser, `학생 '${name}' 추가`);
    } catch (error) {
      console.error("Error adding student:", error);
      alert("학생 추가 중 오류가 발생했습니다.");
    }
  };

  const removeStudent = async (id: string, name: string) => {
    if (window.confirm(`정말 '${name}' 학생을 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, 'students', id));
        logActivity(currentUser, `학생 '${name}' 삭제`);
      } catch (error) {
        console.error("Error removing student:", error);
      }
    }
  };

  const openEditStudentModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation(); // prevent other clicks
    setEditingStudentId(student.id);
    setEditStudentName(student.name);
    setEditStudentSchool(student.school);
    setEditStudentGrade(student.grade);
    setEditStudentClass(student.studentClass || '');
    
    let normalizedAssigns: string[];
    if (student.assignedItems) {
      const hasLessonPrefix = student.assignedItems.some(k => LESSONS.some(l => k.startsWith(`${l}_`)));
      if (!hasLessonPrefix) {
        normalizedAssigns = LESSONS.flatMap(l => student.assignedItems!.map(k => `${l}_${k}`));
      } else {
        normalizedAssigns = student.assignedItems.map(k => {
          if (!LESSONS.some(l => k.startsWith(`${l}_`))) return `1과_${k}`;
          return k;
        });
      }
    } else {
      normalizedAssigns = LESSONS.flatMap(l => ALL_CHECKLIST_ITEMS.map(i => `${l}_${i.id}`));
    }
    setEditStudentAssignedItems(normalizedAssigns);
    
    const normalizedTasks = (student.customTasks || []).map(t => ({
      ...t,
      lesson: t.lesson || '1과'
    }));
    setEditStudentCustomTasks(normalizedTasks);
    setNewCustomTask("");
    setEditPopupLesson(LESSONS[0]);
    
    // Position the popup slightly below and to the right of the cursor
    setEditPopupPosition({
      top: e.clientY + 15,
      left: e.clientX + 10
    });
  };

  const saveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId || !editStudentName.trim()) return;

    try {
      await updateDoc(doc(db, 'students', editingStudentId), {
        name: editStudentName.trim(),
        school: editStudentSchool,
        grade: editStudentGrade,
        studentClass: editStudentClass.trim(),
        assignedItems: editStudentAssignedItems,
        customTasks: editStudentCustomTasks
      });
      logActivity(currentUser, `학생 '${editStudentName}' 정보 수정`);
      setEditingStudentId(null);
    } catch (error) {
      console.error("Error updating student:", error);
      alert("학생 정보 수정 중 오류가 발생했습니다.");
    }
  };

  const getStudentProgressState = (student: Student, lesson: string, itemId: string) => {
    const key = `${lesson}_${itemId}`;
    let progressData = student.progress?.[key];
    if (progressData === undefined && lesson === '1과') {
      progressData = student.progress?.[itemId];
    }
    const isLegacyBoolean = typeof progressData === 'boolean';
    return {
      isChecked: isLegacyBoolean ? progressData : (progressData?.isChecked ?? false),
      data: progressData
    };
  };

  const isItemAssigned = (student: Student, lesson: string, itemId: string) => {
    // If it's a teacher custom task, only show it if the current student actually has it
    if (itemId.startsWith('custom_')) {
      const isStudentCustomTask = student.customTasks?.some(t => t.id === itemId && (t.lesson || '1과') === lesson);
      if (!isStudentCustomTask) return false;
    }

    if (!student.assignedItems) return true;
    const key = `${lesson}_${itemId}`;
    if (student.assignedItems.includes(key)) return true;
    const hasLessonPrefix = student.assignedItems.some(k => LESSONS.some(l => k.startsWith(`${l}_`)));
    if (!hasLessonPrefix && student.assignedItems.includes(itemId)) return true;
    if (lesson === '1과' && student.assignedItems.includes(itemId)) return true;
    return false;
  };

  const getAllPossibleAssignedItems = (student: Student) => {
    if (student.assignedItems) {
      const hasLessonPrefix = student.assignedItems.some(k => LESSONS.some(l => k.startsWith(`${l}_`)));
      if (!hasLessonPrefix) {
        return LESSONS.flatMap(l => student.assignedItems!.map(k => `${l}_${k}`));
      }
      return student.assignedItems.map(key => {
        if (!LESSONS.some(l => key.startsWith(`${l}_`))) return `1과_${key}`;
        return key;
      });
    }
    return LESSONS.flatMap(l => ALL_CHECKLIST_ITEMS.map(i => `${l}_${i.id}`));
  };

  const toggleProgress = async (studentId: string, studentName: string, lesson: string, itemId: string, currentState: boolean) => {
    const itemLabel = ALL_CHECKLIST_ITEMS.find(i => i.id === itemId)?.label || itemId;
    const actionDesc = `학생 '${studentName}'의 [${lesson} ${itemLabel}] ${!currentState ? '완료 처리' : '완료 해제'}`;
    
    try {
      // Create a dot notation key for Firestore to update only the specific nested field
      const updateKey = `progress.${lesson}_${itemId}`;
      await updateDoc(doc(db, 'students', studentId), {
        [updateKey]: {
          isChecked: !currentState,
          updatedBy: currentUser,
          updatedAt: Date.now()
        }
      });
      logActivity(currentUser, actionDesc);
    } catch (error) {
      console.error("Error toggling progress:", error);
      // Fallback for if the document or progress object doesn't exist yet properly
      try {
        const studentRef = doc(db, 'students', studentId);
        const docSnap = await getDoc(studentRef);
        if (docSnap.exists()) {
           const studentData = docSnap.data() as Student;
           studentData.progress[`${lesson}_${itemId}`] = {
             isChecked: !currentState,
             updatedBy: currentUser,
             updatedAt: Date.now()
           };
           await setDoc(studentRef, studentData);
           logActivity(currentUser, actionDesc);
        }
      } catch (e) {
        console.error("Fallback failed:", e);
      }
    }
  };

  const calculateStudentProgress = (student: Student) => {
    const activeMaterial = ALL_MATERIALS.find(m => m.title === activeMaterialId);
    const assignedKeys = getAllPossibleAssignedItems(student);
    
    // Overall progress
    let totalAssigned = assignedKeys.length;
    let totalCompleted = 0;
    assignedKeys.forEach(key => {
      const match = key.match(/^(\d+과)_(.+)$/);
      if (match) {
        const [, lesson, itemId] = match;
        if (getStudentProgressState(student, lesson, itemId).isChecked) totalCompleted++;
      }
    });
    const overallProgressPct = totalAssigned === 0 ? 0 : Math.round((totalCompleted / totalAssigned) * 100);

    // Current tab progress
    let tabProgressPct = 0;
    if (activeMaterial) {
      const materialItemIds = activeMaterial.categories.flatMap(cat => cat.items).map(i => i.id);
      const tabAssignedKeys = assignedKeys.filter(key => {
        const match = key.match(/^(\d+과)_(.+)$/);
        if (!match) return false;
        const [, lesson, itemId] = match;
        return lesson === activeLesson && materialItemIds.includes(itemId);
      });
      const totalInTab = tabAssignedKeys.length;
      let completedInTab = 0;
      
      tabAssignedKeys.forEach(key => {
        const match = key.match(/^(\d+과)_(.+)$/);
        if (match) {
          const [, lesson, itemId] = match;
          if (getStudentProgressState(student, lesson, itemId).isChecked) completedInTab++;
        }
      });
      tabProgressPct = totalInTab === 0 ? 0 : Math.round((completedInTab / totalInTab) * 100);
    }
    
    return {
      currentMaterialPct: tabProgressPct,
      overallPct: overallProgressPct
    };
  };

  const getGradeAverageProgress = (grade: string) => {
    const gradeStudents = students.filter(s => s.grade === grade);
    if (gradeStudents.length === 0) return 0;
    let totalPct = 0;
    gradeStudents.forEach(s => {
      totalPct += calculateStudentProgress(s).overallPct;
    });
    return Math.round(totalPct / gradeStudents.length);
  };

  const migrateLocalDataToFirebase = async (userName: string) => {
    try {
      const LOCAL_STORAGE_KEY = 'exam-tracker-students';
      const MIGRATED_KEY = 'exam-tracker-migrated-to-firebase';
      
      if (localStorage.getItem(MIGRATED_KEY)) return; // Already migrated

      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`기존 로컬 데이터 ${parsed.length}명 파이어베이스로 마이그레이션 시작...`);
          
          const promises = parsed.map(async (student) => {
            if (!student.id || !student.name) return;
            const cleanStudent: Student = {
              id: student.id,
              name: student.name,
              school: student.school || '전체',
              grade: student.grade || '전체',
              progress: student.progress || {},
              comments: student.comments || []
            };
            return setDoc(doc(db, 'students', cleanStudent.id), cleanStudent);
          });
          
          await Promise.all(promises);
          localStorage.setItem(MIGRATED_KEY, 'true');
          alert(`🎉 예전에 브라우저에 저장하셨던 ${parsed.length}명의 학생 데이터가 서버로 성공적으로 복구(연동)되었습니다!`);
          logActivity(userName, '기존 로컬 데이터 파이어베이스로 이전 시스템 완료');
        }
      }
    } catch (error) {
      console.error("Migration failed:", error);
    }
  };

  const handleLogout = async () => {
    logActivity(currentUser, '로그아웃');
    alert("안전하게 로그아웃 되었습니다.");
    setCurrentUser('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (loginPasswordInput !== 'jctj8877') {
      setLoginError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (loginNameInput.trim()) {
      const rawName = loginNameInput.trim();
      const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      setCurrentUser(capitalizedName);
      setLoginPasswordInput('');
      
      // Log history to Firestore
      logActivity(capitalizedName, '로그인');
      
      // Automatically migrate old LocalStorage data if it exists and hasn't been migrated yet.
      migrateLocalDataToFirebase(capitalizedName);
    } else {
      setLoginError('이름을 입력해주세요.');
    }
  };

  const updateExamDate = async (school: string, grade: string, startDateStr: string, endDateStr: string) => {
    try {
      const docId = `${school}_${grade}`;
      await setDoc(doc(db, 'exam_dates', docId), { school, grade, startDateStr, endDateStr });
      logActivity(currentUser, `'${school} ${grade}' 시험일정 변경`);
    } catch (error) {
      console.error("Error updating exam date:", error);
    }
  };

  const handleResetAll = async () => {
    if (resetConfirmText !== '전체 리셋 하겠습니다') {
      alert("입력한 문구가 일치하지 않습니다.");
      return;
    }

    try {
      // Loop through all students and reset their progress
      const promises = students.map(student => 
        updateDoc(doc(db, 'students', student.id), { progress: {} })
      );
      await Promise.all(promises);

      logActivity(currentUser, '전체 학생 진행도 리셋');
      setShowResetModal(false);
      setResetConfirmText('');
      alert("모든 학생의 진행도가 성공적으로 초기화되었습니다.");
    } catch (error) {
      console.error("Error resetting all progress:", error);
      alert("초기화 중 오류가 발생했습니다.");
    }
  };

  const handleBulkAssign = async () => {
    if (bulkAssignSelectedStudents.length === 0) {
      alert("배정할 학생을 1명 이상 선택해주세요.");
      return;
    }
    if (bulkAssignSelectedItems.length === 0 && bulkAssignCustomTasksList.length === 0) {
      alert("배정할 과제를 1개 이상 선택해주세요.");
      return;
    }

    try {
      const batch = writeBatch(db);
      
      bulkAssignSelectedStudents.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const currentAssigned = student.assignedItems || [];
        
        const filteredAssigned = currentAssigned.filter(item => {
          if (!item.startsWith(`${bulkAssignLesson}_`)) return true;
          if (item.startsWith(`${bulkAssignLesson}_custom_`)) return true;
          return false;
        });

        const newAssignedItems = bulkAssignSelectedItems.map(itemId => `${bulkAssignLesson}_${itemId}`);
        
        let updatedCustomTasks = student.customTasks ? [...student.customTasks] : [];
        const newCustomTaskKeys: string[] = [];

        bulkAssignCustomTasksList.forEach(task => {
          if (!updatedCustomTasks.some(t => t.id === task.id && (t.lesson || '1과') === bulkAssignLesson)) {
            updatedCustomTasks.push({ ...task, lesson: bulkAssignLesson });
          }
          newCustomTaskKeys.push(`${bulkAssignLesson}_${task.id}`);
        });

        const updatedAssigned = Array.from(new Set([...filteredAssigned, ...newAssignedItems, ...newCustomTaskKeys]));
        
        batch.update(doc(db, 'students', studentId), {
          assignedItems: updatedAssigned,
          customTasks: updatedCustomTasks
        });
      });

      await batch.commit();
      logActivity(currentUser, `${bulkAssignSelectedStudents.length}명 학생에게 ${bulkAssignLesson} 일괄 과제 배정`);
      
      setShowBulkAssignModal(false);
      setBulkAssignSelectedStudents([]);
      setBulkAssignSelectedItems([]);
      setBulkAssignCustomTasksList([]);
      setBulkAssignNewCustomTask('');
      alert("일괄 배정이 완료되었습니다.");
    } catch (error) {
      console.error("일괄 배정 오류:", error);
      alert("일괄 배정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAllStudents = async () => {
    if (deleteAllConfirmText !== '학생 전체 삭제 하겠습니다') {
      alert("입력한 문구가 일치하지 않습니다.");
      return;
    }

    try {
      // Loop through all students and delete their documents using Firebase deleteDoc
      const promises = students.map(student => 
        deleteDoc(doc(db, 'students', student.id))
      );
      await Promise.all(promises);

      logActivity(currentUser, '모든 학생 데이터 영구 삭제');
      setShowDeleteAllModal(false);
      setDeleteAllConfirmText('');
      alert("모든 학생 데이터가 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting all students:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const openCommentModal = async (studentId: string) => {
    setSelectedStudentIdForComments(studentId);
    
    // Mark unread comments as read by the current user
    const student = students.find(s => s.id === studentId);
    if (!student || !student.comments || !currentUser) return;

    let hasUpdates = false;
    const updatedComments = student.comments.map(comment => {
      // If it's not authored by me, and I haven't read it
      if (comment.author !== currentUser && (!comment.readBy || !comment.readBy.includes(currentUser))) {
        hasUpdates = true;
        return {
          ...comment,
          readBy: [...(comment.readBy || []), currentUser]
        };
      }
      return comment;
    });

    if (hasUpdates) {
      try {
        await updateDoc(doc(db, 'students', studentId), {
          comments: updatedComments
        });
      } catch (error) {
        console.error("Error marking comments as read:", error);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedStudentIdForComments) return;

    const studentToComment = students.find(s => s.id === selectedStudentIdForComments);
    if (!studentToComment) return;

    const newComment: StudentComment = {
      id: crypto.randomUUID(),
      text: newCommentText.trim(),
      author: currentUser,
      timestamp: Date.now(),
      readBy: [currentUser]
    };

    try {
      const studentRef = doc(db, 'students', selectedStudentIdForComments);
      const currentComments = studentToComment.comments || [];
      await updateDoc(studentRef, {
        comments: [...currentComments, newComment]
      });
      setNewCommentText('');
      logActivity(currentUser, `학생 '${studentToComment.name}'에 코멘트 추가`);
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("코멘트 추가 중 오류가 발생했습니다.");
    }
  };

  const calculateDDay = (school: string, grade: string) => {
    const examDate = examDates.find(d => d.school === school && d.grade === grade);
    if (!examDate || !examDate.startDateStr || !examDate.endDateStr) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseToDate = (str: string) => {
      const { m, d } = parseStoredDate(str);
      if (!m || !d) return null;
      const curY = today.getFullYear();
      const curM = today.getMonth() + 1;
      const month = parseInt(m, 10);
      const day = parseInt(d, 10);
      
      let targetY = curY;
      // if today is Nov/Dec, and target is Jan/Feb, next year
      if (curM >= 11 && month <= 2) targetY = curY + 1;
      return new Date(targetY, month - 1, day);
    };

    const start = parseToDate(examDate.startDateStr);
    const end = parseToDate(examDate.endDateStr);
    if (!start || !end) return null;

    if (today >= start && today <= end) {
      return `시험 기간 (종료까지 D-${Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))})`;
    }

    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `D-${diffDays}`;
    return `시험 종료`;
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  };


  if (!currentUser) {
    return (
      <div className="container fade-in flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}윌그로우로고.png`} alt="윌그로우 로고" style={{ height: '40px', marginBottom: '1rem', objectFit: 'contain' }} />
          <h1 className="title" style={{ fontSize: '2rem' }}>환영합니다</h1>
          <p className="subtitle" style={{ marginBottom: '2rem' }}>내신대비 트래커에 접속하려면 이름을 입력해주세요.</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="text"
              className="input"
              placeholder="이름 (예: 홍길동 선생님)"
              value={loginNameInput}
              onChange={(e) => {
                const val = e.target.value;
                setLoginNameInput(val ? val.charAt(0).toUpperCase() + val.slice(1) : val);
              }}
              autoFocus
            />
            <input
              type="password"
              className="input"
              placeholder="비밀번호"
              value={loginPasswordInput}
              onChange={(e) => setLoginPasswordInput(e.target.value)}
            />
            {loginError && <div style={{ color: 'var(--accent-red)', fontSize: '0.9rem', textAlign: 'left' }}>{loginError}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  const availableClasses = ["전체", ...Array.from(new Set(students.map(s => s.studentClass).filter(c => c && c.trim() !== ''))).sort()];

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = filterSchool === '전체' || student.school === filterSchool;
    const matchesGrade = filterGrade === '전체' || student.grade === filterGrade;
    const matchesClass = filterClass === '전체' || student.studentClass === filterClass;
    
    // Filter out students who have 0 assigned items matching the current active tab
    const activeMaterial = ALL_MATERIALS.find(m => m.title === activeMaterialId);
    const hasAnyActiveItem = activeMaterial?.categories.some(cat => 
        cat.items.some(item => isItemAssigned(student, activeLesson, item.id))
    );
    
    const isSearching = searchQuery.trim().length > 0;
    return matchesSearch && matchesSchool && matchesGrade && matchesClass && (hasAnyActiveItem || isSearching);
  });

  const studentsWithProgress = students.map(student => ({
    ...student,
    progressData: calculateStudentProgress(student)
  }));
  
  // Exclude students with 0% from bottom if they just started? Or keep it literal? 
  // Let's keep it literal and just sort. To resolve ties it's stable enough.
  const sortedByProgressDesc = [...studentsWithProgress].sort((a, b) => b.progressData.currentMaterialPct - a.progressData.currentMaterialPct);
  const top3Students = sortedByProgressDesc.slice(0, 3);
  
  // To avoid showing the exact same top 3 in bottom 3 if there are very few students,
  // we can just reverse, but normally we just take the last 3 or sort ascending.
  const sortedByProgressAsc = [...studentsWithProgress].sort((a, b) => a.progressData.currentMaterialPct - b.progressData.currentMaterialPct);
  const bottom3Students = sortedByProgressAsc.slice(0, 3);

  return (
    <>
      <div className="container fade-in">
      <header className="flex-col items-center justify-center gap-3" style={{ marginBottom: '2.5rem', textAlign: 'center', position: 'relative', width: '100%', overflow: 'hidden' }}>
        <img src={`${import.meta.env.BASE_URL}윌그로우로고.png`} alt="윌그로우 로고" style={{ height: '50px', marginBottom: '0.5rem', objectFit: 'contain' }} />
        <h1 className="title">내신 대비 마스터</h1>
        <p className="subtitle">학생 진행도 트래커</p>
        
        <div className="header-actions-mobile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              접속자: <strong>{currentUser}</strong>
            </span>

            <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              로그아웃
            </button>
          </div>
          <button 
             onClick={() => setShowLoginHistoryModal(true)} 
             className="btn" 
             style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}>
            최근 활동 기록 보기
          </button>
        </div>
        <div className="header-actions-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
           <button 
             onClick={() => setShowExamDateModal(true)} 
             className="btn" 
             style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            학교별 시험일 설정
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => setShowBulkAddModal(true)} 
              className="btn" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--accent-gold, #2e7d32)', color: 'white', border: 'none' }}>
              학생 일괄 등록
            </button>
            <button 
              onClick={() => setShowBulkAssignModal(true)} 
              className="btn" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none' }}>
              과제 일괄 배정
            </button>
            <button 
               onClick={() => setShowResetModal(true)} 
               className="btn" 
               style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>
              진행도 전체 리셋
            </button>
            <button 
               onClick={() => setShowDeleteAllModal(true)} 
               className="btn btn-danger" 
               style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              학생 전체 삭제
            </button>
          </div>
        </div>
      </header>

      <main className="card">
        <form onSubmit={addStudent} className="student-add-form" style={{ flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            style={{ width: '180px', flex: 'none' }}
            placeholder="새로운 학생 이름..."
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
          />
          <input
            type="text"
            className="input"
            style={{ width: '100px', flex: 'none' }}
            placeholder="Class"
            value={newStudentClass}
            onChange={(e) => setNewStudentClass(e.target.value)}
          />
          <select 
            className="select" 
            value={newStudentSchool} 
            onChange={(e) => setNewStudentSchool(e.target.value)}
          >
            {SCHOOLS.filter(s => s !== '전체').map(school => (
               <option key={school} value={school}>{school}</option>
            ))}
          </select>
          <select 
            className="select" 
            value={newStudentGrade} 
            onChange={(e) => setNewStudentGrade(e.target.value)}
          >
            {GRADES.filter(g => g !== '전체').map(grade => (
               <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            추가
          </button>
        </form>

        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input search-input"
            style={{ flex: 1, minWidth: '150px' }}
            placeholder="학생 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className="select" 
            value={filterSchool} 
            onChange={(e) => setFilterSchool(e.target.value)}
          >
            {SCHOOLS.map(school => (
               <option key={school} value={school}>{school}</option>
            ))}
          </select>
          <select 
            className="select" 
            value={filterGrade} 
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            {GRADES.map(grade => (
               <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <select 
            className="select" 
            value={filterClass} 
            onChange={(e) => setFilterClass(e.target.value)}
          >
            {availableClasses.map(c => (
               <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="material-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {ALL_MATERIALS.map(material => (
            <button
              key={material.title}
              onClick={() => setActiveMaterialId(material.title)}
              className="btn"
              style={{
                padding: '0.6rem 1.2rem',
                whiteSpace: 'nowrap',
                backgroundColor: activeMaterialId === material.title ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                color: activeMaterialId === material.title ? 'white' : 'var(--text-primary)',
                border: `1px solid ${activeMaterialId === material.title ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                fontWeight: activeMaterialId === material.title ? 'bold' : 'normal',
                boxShadow: activeMaterialId === material.title ? '0 2px 8px rgba(33, 150, 243, 0.3)' : 'none'
              }}
            >
              {material.title}
            </button>
          ))}
        </div>

        <div className="lesson-tabs" style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
          {LESSONS.map(lesson => (
            <button
              key={lesson}
              onClick={() => setActiveLesson(lesson)}
              className="btn"
              style={{
                backgroundColor: activeLesson === lesson ? 'var(--accent-gold, #d4af37)' : 'var(--bg-secondary)',
                color: activeLesson === lesson ? 'white' : 'var(--text-secondary)',
                fontWeight: activeLesson === lesson ? 'bold' : 'normal',
                fontSize: '0.9rem',
                border: activeLesson === lesson ? 'none' : '1px solid var(--border-color)',
                whiteSpace: 'nowrap',
                padding: '0.4rem 0.8rem',
                borderRadius: '20px'
              }}
            >
              {lesson}
            </button>
          ))}
        </div>

        {/* Ranking Dashboard */}
        {filteredStudents.length > 0 && (
          <div className="flex-mobile-col" style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {/* Top 3 */}
            <div style={{ flex: 1, minWidth: 'min(100%, 250px)', backgroundColor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '12px', padding: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#2e7d32', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏆 달성율 RANK TOP 3 ({activeMaterialId})
              </h3>
              <ol style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {top3Students.filter(s => filteredStudents.some(fs => fs.id === s.id)).slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{s.name}</span> ({s.school} {s.grade}{s.studentClass ? ` - ${s.studentClass}` : ''}) - <strong style={{ color: '#2e7d32' }}>{s.progressData.currentMaterialPct}%</strong>
                  </li>
                ))}
              </ol>
            </div>
            
            {/* Bottom 3 */}
            <div style={{ flex: 1, minWidth: 'min(100%, 250px)', backgroundColor: 'rgba(244, 67, 54, 0.05)', border: '1px solid rgba(244, 67, 54, 0.2)', borderRadius: '12px', padding: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#c62828', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚨 달성율 HURRY UP BOTTOM 3 ({activeMaterialId})
              </h3>
              <ol style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {bottom3Students.filter(s => filteredStudents.some(fs => fs.id === s.id)).slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{s.name}</span> ({s.school} {s.grade}{s.studentClass ? ` - ${s.studentClass}` : ''}) - <strong style={{ color: '#c62828' }}>{s.progressData.currentMaterialPct}%</strong>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <div className="tracker-container">
          <table className="tracker-table">
            <thead>
              <tr>
                <th rowSpan={2} className="student-name-col">학생 명단</th>
                {ALL_MATERIALS.find(m => m.title === activeMaterialId)?.categories.map(category => (
                  <th key={category.title} colSpan={category.items.length} className="category-header">
                    {category.title}
                  </th>
                ))}
              </tr>
              <tr>
                {ALL_MATERIALS.find(m => m.title === activeMaterialId)?.categories.flatMap(cat => cat.items).map(item => (
                  <th key={item.id} title={item.label} style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-primary)' }}>
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={(ALL_MATERIALS.find(m => m.title === activeMaterialId)?.categories.flatMap(cat => cat.items).length || 0) + 1} style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    {searchQuery ? '검색 결과가 없습니다.' : '현재 탭에 배정된 할일이 있는 학생이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const progressPct = calculateStudentProgress(student);
                  const dDayText = calculateDDay(student.school, student.grade);
                  
                  return (
                    <tr key={student.id}>
                      <td className="student-name-col">
                        <div className="flex flex-col gap-1">
                          <span 
                            style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', width: 'fit-content' }}
                          >
                            <span 
                              style={{ textDecoration: 'underline', color: 'var(--text-primary)', cursor: 'pointer' }}
                              onClick={(e) => openEditStudentModal(e, student)}
                              title="클릭하여 학생 정보 수정"
                            >
                              {student.name}
                              {student.studentClass ? <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.3rem', fontWeight: 'normal' }}>({student.studentClass})</span> : null}
                            </span>
                            <span 
                              style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', position: 'relative', cursor: 'pointer' }}
                              onClick={() => openCommentModal(student.id)}
                              title="클릭하여 학생 코멘트 열람"
                            >
                              💬
                              {student.comments?.some(c => c.author !== currentUser && (!c.readBy || !c.readBy.includes(currentUser))) && (
                                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: 'var(--accent-red)', borderRadius: '50%', boxShadow: '0 0 4px var(--accent-red-glow)' }} />
                              )}
                            </span>
                            <span 
                              style={{ fontSize: '0.8rem', cursor: 'pointer', marginLeft: '0.3rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintStudentId(student.id);
                                setPrintSpeed('보통');
                                setPrintComment('');
                              }}
                              title="결과지 인쇄/옵션보기"
                            >🖨️</span>
                            {dDayText && <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px', backgroundColor: dDayText === '시험 종료' ? 'var(--bg-secondary)' : 'var(--accent-red)', color: dDayText === '시험 종료' ? 'var(--text-secondary)' : 'white', cursor: 'default', marginLeft: '0.3rem' }}>{dDayText}</span>}
                          </span>
                          
                          {/* Current Material Progress */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span>현재 탭 달성률 ({activeMaterialId})</span>
                              <span style={{ fontWeight: 'bold' }}>{progressPct.currentMaterialPct}%</span>
                            </div>
                            <div className="progress-wrapper">
                              <div className="progress-fill" style={{ width: `${progressPct.currentMaterialPct}%` }} />
                            </div>
                          </div>

                          {/* Overall Material Progress */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span>전체 과정 달성률 (통합)</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--accent-gold, #b8860b)' }}>{progressPct.overallPct}%</span>
                            </div>
                            <div className="progress-wrapper" style={{ backgroundColor: 'rgba(184, 134, 11, 0.15)' }}>
                              <div className="progress-fill" style={{ width: `${progressPct.overallPct}%`, backgroundColor: 'var(--accent-gold, #d4af37)' }} />
                            </div>
                          </div>

                        </div>
                      </td>
                      {ALL_MATERIALS.find(m => m.title === activeMaterialId)?.categories.flatMap(cat => cat.items).map(item => {
                        const isAssigned = isItemAssigned(student, activeLesson, item.id);
                        
                        const progressState = getStudentProgressState(student, activeLesson, item.id);
                        const isChecked = progressState.isChecked;
                        let tooltip = `${student.name} - ${item.label}`;
                        
                        if (isChecked) {
                          if (typeof progressState.data === 'boolean') {
                            tooltip = `${student.name} - ${item.label} (선생님/시간 기록 없음)`;
                          } else if (progressState.data && typeof progressState.data !== 'boolean') {
                            tooltip = `체크: ${progressState.data.updatedBy}\n일시: ${formatDate(progressState.data.updatedAt || 0)}`;
                          }
                        }

                        if (!isAssigned) {
                          return (
                            <td key={item.id} className="checklist-cell" style={{ backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="check-toggle"
                                style={{ opacity: 0.3, cursor: 'not-allowed' }}
                                title="할당되지 않은 과제입니다"
                                checked={!!isChecked}
                                readOnly
                              />
                            </td>
                          );
                        }
                        
                        const categoryInfo = ALL_MATERIALS.find(m => m.title === activeMaterialId)?.categories.find(c => c.items.some(i => i.id === item.id));
                        const mobileLabel = categoryInfo ? `[${categoryInfo.title}] ${item.label}` : item.label;
                          
                        return (
                          <td key={item.id} className="checklist-cell" data-label={mobileLabel}>
                            <input
                              type="checkbox"
                              title={tooltip}
                              className="check-toggle"
                              checked={!!isChecked}
                              onChange={() => toggleProgress(student.id, student.name, activeLesson, item.id, !!isChecked)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Login History Modal */}
      {showLoginHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}} onClick={() => { setShowLoginHistoryModal(false); setSelectedHistoryTeacher(null); }}>
          <div className="card fade-in" style={{ width: '400px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>
                {selectedHistoryTeacher ? `'${selectedHistoryTeacher}' 선생님 활동 내역` : '최근 접속 및 활동 기록'}
              </h2>
              <div>
                {selectedHistoryTeacher && (
                  <button onClick={() => setSelectedHistoryTeacher(null)} className="btn" style={{ padding: '0.3rem 0.6rem', marginRight: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>뒤로</button>
                )}
                <button onClick={() => {
                  setShowLoginHistoryModal(false);
                  setSelectedHistoryTeacher(null);
                }} className="btn" style={{ padding: '0.3rem 0.6rem' }}>닫기</button>
              </div>
            </div>
            {loginHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>기록이 없습니다.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(selectedHistoryTeacher ? loginHistory.filter(r => r.name === selectedHistoryTeacher) : loginHistory).slice(0, 30).map((record, idx) => (
                  <li key={record.id || idx} style={{ padding: '0.8rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>
                        <span 
                          style={{ 
                            cursor: selectedHistoryTeacher ? 'default' : 'pointer', 
                            textDecoration: selectedHistoryTeacher ? 'none' : 'underline',
                            color: selectedHistoryTeacher ? 'inherit' : 'var(--accent-blue)'
                          }}
                          onClick={() => { if (!selectedHistoryTeacher) setSelectedHistoryTeacher(record.name); }}
                          title={!selectedHistoryTeacher ? "클릭하여 이 선생님의 기록만 보기" : ""}
                        >
                          {record.name}
                        </span>
                        <span style={{ fontWeight: 'normal', fontSize: '0.85rem', color: 'var(--text-secondary)' }}> - {record.action || '로그인'}</span>
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDate(record.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Exam Date Modal */}
      {showExamDateModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}} onClick={() => setShowExamDateModal(false)}>
          <div className="card fade-in" style={{ width: '450px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'sticky', top: 0, backgroundColor: 'var(--bg-primary)', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
              <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>학교/학년별 시험 기간 설정</h2>
              <button onClick={() => setShowExamDateModal(false)} className="btn" style={{ padding: '0.3rem 0.6rem' }}>닫기</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {SCHOOLS.filter(s => s !== '전체').map(school => (
                <div key={school} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>{school}</h3>
                  {GRADES.filter(g => g !== '전체').map(grade => {
                    const currentSetting = examDates.find(d => d.school === school && d.grade === grade);
                    return (
                      <div key={`${school}_${grade}`} style={{ display: 'flex', flexDirection: 'column', padding: '0.8rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', gap: '0.6rem' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.95rem', color: 'var(--accent-blue)' }}>{grade}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '35px' }}>시작:</span>
                          <MonthDayInput 
                            value={currentSetting?.startDateStr || ''}
                            onChange={(val) => updateExamDate(school, grade, val, currentSetting?.endDateStr || '')}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '35px' }}>종료:</span>
                          <MonthDayInput 
                            value={currentSetting?.endDateStr || ''}
                            onChange={(val) => updateExamDate(school, grade, currentSetting?.startDateStr || '', val)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset All Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}} onClick={() => { setShowResetModal(false); setResetConfirmText(''); }}>
          <div className="card fade-in" style={{ width: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-red)' }}>⚠️ 전체 진행도 리셋</h2>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              모든 학생의 체크리스트 진행 상황이 <strong>0%로 완전히 초기화</strong>됩니다.<br />
              학생 명단은 삭제되지 않습니다.<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
              정말 초기화하시려면 아래 문구를 똑같이 입력해주세요:
            </p>
            <p style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', userSelect: 'none' }}>
              전체 리셋 하겠습니다
            </p>
            <input 
              type="text"
              className="input"
              style={{ width: '100%', textAlign: 'center', marginBottom: '1.5rem' }}
              placeholder="위 문구를 입력하세요"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-danger"
                onClick={handleResetAll}
                disabled={resetConfirmText !== '전체 리셋 하겠습니다'}
                style={{ opacity: resetConfirmText !== '전체 리셋 하겠습니다' ? 0.5 : 1 }}
              >
                초기화 실행
              </button>
              <button 
                className="btn"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Students Modal */}
      {showDeleteAllModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}} onClick={() => { setShowDeleteAllModal(false); setDeleteAllConfirmText(''); }}>
          <div className="card fade-in" style={{ width: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-red)' }}>🚨 학생 전체 영구 삭제</h2>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              등록된 <strong>모든 학생 데이터가 데이터베이스에서 영구히 삭제</strong>됩니다.<br />
              진행 상황을 포함한 모든 기록이 지워지며,<br />
              이 작업은 절대로 되돌릴 수 없습니다.
            </p>
            <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
              정말 모두 삭제하시려면 아래 문구를 똑같이 입력해주세요:
            </p>
            <p style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', userSelect: 'none' }}>
              학생 전체 삭제 하겠습니다
            </p>
            <input 
              type="text"
              className="input"
              style={{ width: '100%', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid var(--accent-red)' }}
              placeholder="위 문구를 입력하세요"
              value={deleteAllConfirmText}
              onChange={(e) => setDeleteAllConfirmText(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteAllStudents}
                disabled={deleteAllConfirmText !== '학생 전체 삭제 하겠습니다'}
                style={{ opacity: deleteAllConfirmText !== '학생 전체 삭제 하겠습니다' ? 0.5 : 1 }}
              >
                영구 삭제 실행
              </button>
              <button 
                className="btn"
                onClick={() => {
                  setShowDeleteAllModal(false);
                  setDeleteAllConfirmText('');
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Comments Modal */}
      {selectedStudentIdForComments && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}} onClick={() => { setSelectedStudentIdForComments(null); setNewCommentText(''); }}>
          <div className="card fade-in" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>
                {students.find(s => s.id === selectedStudentIdForComments)?.name} 선생님 코멘트 💬
              </h2>
              <button onClick={() => {
                setSelectedStudentIdForComments(null);
                setNewCommentText('');
              }} className="btn" style={{ padding: '0.3rem 0.6rem' }}>닫기</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.5rem' }}>
              {(() => {
                const s = students.find(st => st.id === selectedStudentIdForComments);
                const comments = s?.comments || [];
                if (comments.length === 0) {
                  return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>아직 등록된 코멘트가 없습니다.</p>;
                }
                return comments.map(c => (
                  <div key={c.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '500', color: 'var(--accent-blue)', fontSize: '0.9rem' }}>{c.author} 선생님</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(c.timestamp)}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{c.text}</p>
                  </div>
                ));
              })()}
            </div>

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <input 
                type="text" 
                className="input" 
                style={{ flex: 1 }} 
                placeholder="새로운 코멘트 입력..." 
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={!newCommentText.trim()}>등록</button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Student Modal */}
      {showBulkAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}} onClick={() => setShowBulkAddModal(false)}>
          <div className="card fade-in" style={{ width: '600px', maxWidth: '90vw', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>학생 일괄 등록</h2>
              <button onClick={() => setShowBulkAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
              복수 학생의 정보를 한 줄로 입력하여 여러 명을 동시에 등록할 수 있습니다.<br/>
              <strong>형식:</strong> 이름 학교 학년 반 (공백, 쉼표 또는 탭으로 구분)<br/>
              <strong style={{ color: '#d32f2f' }}>주의:</strong> 반 이름에 영어가 들어갈 경우 반드시 <strong>대문자</strong>로 입력해주세요.<br/>
              <strong>예시:</strong><br/>
              <span style={{ display: 'block', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.3rem', fontFamily: 'monospace' }}>
                지드래곤 단대부고 1학년 A반<br/>
                아이유 경기고 2학년 B반<br/>
                장원영 숙명여고 3학년
              </span>
            </p>
            <textarea
              className="input-field"
              style={{ width: '100%', height: '200px', padding: '1rem', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.9rem' }}
              placeholder="여기에 학생 리스트를 붙여넣으세요..."
              value={bulkAddInput}
              onChange={(e) => setBulkAddInput(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn" style={{ padding: '0.6rem 1.2rem' }} onClick={() => setShowBulkAddModal(false)}>
                취소
              </button>
              <button className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', backgroundColor: '#2e7d32', border: 'none' }} onClick={handleBulkAddStudents}>
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}} onClick={() => setShowBulkAssignModal(false)}>
          <div className="card fade-in" style={{ width: '850px', maxWidth: '95vw', height: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>과제 일괄 배정</h2>
              <button onClick={() => setShowBulkAssignModal(false)} className="btn" style={{ padding: '0.3rem 0.6rem' }}>닫기</button>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
              {/* Left Column: Students Selection */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.8rem', borderRight: '1px solid var(--border-color)', paddingRight: '1rem', height: '100%' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>학생 선택</h3>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    className="select" style={{ flex: 1, padding: '0.3rem' }}
                    value={bulkAssignSchoolFilter} 
                    onChange={e => setBulkAssignSchoolFilter(e.target.value)}
                  >
                    {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select 
                    className="select" style={{ flex: 1, padding: '0.3rem' }}
                    value={bulkAssignGradeFilter} 
                    onChange={e => setBulkAssignGradeFilter(e.target.value)}
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select 
                    className="select" style={{ flex: 1, padding: '0.3rem' }}
                    value={bulkAssignClassFilter} 
                    onChange={e => setBulkAssignClassFilter(e.target.value)}
                  >
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox"
                      checked={
                        students.filter(s => (bulkAssignSchoolFilter === '전체' || s.school === bulkAssignSchoolFilter) && (bulkAssignGradeFilter === '전체' || s.grade === bulkAssignGradeFilter) && (bulkAssignClassFilter === '전체' || s.studentClass === bulkAssignClassFilter)).length > 0 &&
                        students.filter(s => (bulkAssignSchoolFilter === '전체' || s.school === bulkAssignSchoolFilter) && (bulkAssignGradeFilter === '전체' || s.grade === bulkAssignGradeFilter) && (bulkAssignClassFilter === '전체' || s.studentClass === bulkAssignClassFilter))
                          .every(s => bulkAssignSelectedStudents.includes(s.id))
                      }
                      onChange={(e) => {
                        const filteredIds = students
                          .filter(s => (bulkAssignSchoolFilter === '전체' || s.school === bulkAssignSchoolFilter) && (bulkAssignGradeFilter === '전체' || s.grade === bulkAssignGradeFilter) && (bulkAssignClassFilter === '전체' || s.studentClass === bulkAssignClassFilter))
                          .map(s => s.id);
                        if (e.target.checked) {
                          setBulkAssignSelectedStudents(prev => Array.from(new Set([...prev, ...filteredIds])));
                        } else {
                          setBulkAssignSelectedStudents(prev => prev.filter(id => !filteredIds.includes(id)));
                        }
                      }}
                    />
                    전체 선택
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{bulkAssignSelectedStudents.length}명 선택됨</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.5rem' }}>
                  {students.filter(s => (bulkAssignSchoolFilter === '전체' || s.school === bulkAssignSchoolFilter) && (bulkAssignGradeFilter === '전체' || s.grade === bulkAssignGradeFilter) && (bulkAssignClassFilter === '전체' || s.studentClass === bulkAssignClassFilter))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(student => (
                    <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={bulkAssignSelectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkAssignSelectedStudents(prev => [...prev, student.id]);
                          } else {
                            setBulkAssignSelectedStudents(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                      />
                      {student.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({student.school} {student.grade})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Right Column: Tasks Selection */}
              <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>과제 선택</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>과정:</span>
                    <select 
                      className="select" 
                      style={{ padding: '0.3rem 0.5rem' }}
                      value={bulkAssignLesson}
                      onChange={e => setBulkAssignLesson(e.target.value)}
                    >
                      {LESSONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1rem', backgroundColor: 'var(--bg-secondary)' }}>
                  {EXAM_MATERIALS.map(material => (
                    <div key={material.title} style={{ marginBottom: '1.2rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem', marginBottom: '0.8rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '1rem' }}>{material.title}</h4>
                        <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                          <input 
                            type="checkbox"
                            checked={material.categories.flatMap(c => c.items).every(i => bulkAssignSelectedItems.includes(i.id)) && material.categories.flatMap(c => c.items).length > 0}
                            onChange={(e) => {
                              const itemIds = material.categories.flatMap(c => c.items).map(i => i.id);
                              if (e.target.checked) {
                                setBulkAssignSelectedItems(prev => Array.from(new Set([...prev, ...itemIds])));
                              } else {
                                setBulkAssignSelectedItems(prev => prev.filter(id => !itemIds.includes(id)));
                              }
                            }}
                          />
                          전체 선택
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
                        {material.categories.flatMap(cat => cat.items).map(item => (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px', width: '100%' }}>
                            <input 
                              type="checkbox"
                              checked={bulkAssignSelectedItems.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) setBulkAssignSelectedItems(prev => [...prev, item.id]);
                                else setBulkAssignSelectedItems(prev => prev.filter(id => id !== item.id));
                              }}
                            />
                            <span style={{ flex: 1, wordBreak: 'keep-all', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Custom Tasks Section inside Bulk Modal */}
                  <div style={{ marginBottom: '1.2rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '1.2rem' }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--accent-blue)', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>선생님 과제 (개별) 일괄 배정</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        className="input"
                        style={{ flex: 1 }}
                        placeholder="새 과제 (예: 단어 재시험)"
                        value={bulkAssignNewCustomTask}
                        onChange={e => setBulkAssignNewCustomTask(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.85rem', whiteSpace: 'nowrap', padding: '0.4rem 1rem' }}
                        onClick={() => {
                          if (!bulkAssignNewCustomTask.trim()) return;
                          const label = bulkAssignNewCustomTask.trim();
                          const id = `custom_${label}`;
                          if (!bulkAssignCustomTasksList.some(t => t.id === id)) {
                            setBulkAssignCustomTasksList(prev => [...prev, { id, label }]);
                          }
                          setBulkAssignNewCustomTask("");
                        }}
                      >추가</button>
                    </div>
                    {bulkAssignCustomTasksList.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' }}>
                        {bulkAssignCustomTasksList.map(task => (
                          <label key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.3rem', borderRadius: '4px', width: '100%', backgroundColor: 'rgba(33, 150, 243, 0.05)', border: '1px solid rgba(33, 150, 243, 0.2)' }}>
                            <span style={{ color: 'var(--accent-blue)', marginRight: '0.3rem' }}>✓</span>
                            <span style={{ flex: 1, wordBreak: 'keep-all', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.label}</span>
                            <button
                              type="button"
                              onClick={() => setBulkAssignCustomTasksList(prev => prev.filter(t => t.id !== task.id))}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}
                            >×</button>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.6rem 2rem', fontSize: '1rem' }}
                onClick={handleBulkAssign}
              >
                선택한 학생(들)에게 배정하기
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Edit Student Popup */}
        {editingStudentId && editPopupPosition && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999}} onClick={() => { setEditingStudentId(null); setEditPopupPosition(null); }}>
            {(() => {
                // 정확하게 클릭한 위치(editPopupPosition) 바로 옆에 뜨도록 계산
                const popW = 850; // 가로로 넓게 표시
                
                // 마우스 클릭 위치보다 살짝 우상단에 기준을 맞춤
                const popLeft = Math.min(editPopupPosition.left + 20, window.innerWidth - popW - 10);
                const popTop = Math.max(10, Math.min(editPopupPosition.top - 30, window.innerHeight - 600)); 

                const cssStyles: React.CSSProperties = {
                  position: 'absolute',
                  width: `${popW}px`, 
                  maxWidth: '95vw',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  left: `${popLeft}px`,
                  top: `${popTop}px`,
                  transformOrigin: `-20px 30px` // 팝업창 바깥의 원래 마우스 위치 방향으로 지정
                };

                return (
                  <div 
                    className="card genie-effect" 
                    style={cssStyles}
                    onClick={e => e.stopPropagation()}
                  >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>학생 정보 수정</h3>
              <button 
                onClick={() => {
                  setEditingStudentId(null);
                  setEditPopupPosition(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveEditStudent} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>학교</label>
                  <select 
                    value={editStudentSchool} 
                    onChange={e => setEditStudentSchool(e.target.value)}
                    className="input-field"
                  >
                    {SCHOOLS.map(school => <option key={school} value={school}>{school}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>학년</label>
                  <select 
                    value={editStudentGrade} 
                    onChange={e => setEditStudentGrade(e.target.value)}
                    className="input-field"
                  >
                    {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>이름</label>
                  <input 
                    type="text" 
                    value={editStudentName} 
                    onChange={e => setEditStudentName(e.target.value)} 
                    placeholder="학생 이름" 
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Class</label>
                  <input 
                    type="text" 
                    value={editStudentClass} 
                    onChange={e => setEditStudentClass(e.target.value)} 
                    placeholder="Class 직접 입력" 
                    className="input-field"
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>학생 할당 과제</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>과정 선택:</span>
                      <select 
                        value={editPopupLesson}
                        onChange={e => setEditPopupLesson(e.target.value)}
                        className="input-field"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem', width: 'auto' }}
                      >
                        {LESSONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.8rem' }}>
                    {EXAM_MATERIALS.map(material => (
                      <div key={material.title} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '0.95rem' }}>{material.title}</h4>
                          <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                            <input 
                              type="checkbox"
                              checked={material.categories.flatMap(c => c.items).every(i => editStudentAssignedItems.includes(`${editPopupLesson}_${i.id}`)) && material.categories.flatMap(c => c.items).length > 0}
                              onChange={(e) => {
                                const assignKeys = material.categories.flatMap(c => c.items).map(i => `${editPopupLesson}_${i.id}`);
                                if (e.target.checked) {
                                  setEditStudentAssignedItems(prev => Array.from(new Set([...prev, ...assignKeys])));
                                } else {
                                  setEditStudentAssignedItems(prev => prev.filter(k => !assignKeys.includes(k)));
                                }
                              }}
                            />
                            전체 선택
                          </label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', paddingLeft: '0.5rem' }}>
                          {material.categories.flatMap(cat => cat.items).map(item => {
                            const assignKey = `${editPopupLesson}_${item.id}`;
                            return (
                              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <input 
                                  type="checkbox"
                                  checked={editStudentAssignedItems.includes(assignKey)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditStudentAssignedItems(prev => [...prev, assignKey]);
                                    } else {
                                      setEditStudentAssignedItems(prev => prev.filter(k => k !== assignKey));
                                    }
                                  }}
                                />
                                {item.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-blue)', fontSize: '0.95rem' }}>선생님 과제 (개별)</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="새 과제"
                          value={newCustomTask}
                          onChange={e => setNewCustomTask(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            if (!newCustomTask.trim()) return;
                            const label = newCustomTask.trim();
                            const id = `custom_${label}`;
                            const assignKey = `${editPopupLesson}_${id}`;
                            
                            setEditStudentCustomTasks(prev => {
                              if (!prev.some(t => t.id === id && t.lesson === editPopupLesson)) {
                                return [...prev, { id, label, lesson: editPopupLesson }];
                              }
                              return prev;
                            });

                            if (!editStudentAssignedItems.includes(assignKey)) {
                               setEditStudentAssignedItems(prev => [...prev, assignKey]);
                            }
                            setNewCustomTask("");
                          }}
                        >
                          추가
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', paddingLeft: '0.5rem' }}>
                         {editStudentCustomTasks.filter(t => t.lesson === editPopupLesson).map(task => {
                           const assignKey = `${editPopupLesson}_${task.id}`;
                           return (
                             <label key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', width: '100%' }}>
                               <input 
                                 type="checkbox"
                                 checked={editStudentAssignedItems.includes(assignKey)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setEditStudentAssignedItems(prev => [...prev, assignKey]);
                                   } else {
                                     setEditStudentAssignedItems(prev => prev.filter(k => k !== assignKey));
                                   }
                                 }}
                               />
                               <span style={{ flex: 1 }}>{task.label}</span>
                               <button type="button" onClick={() => {
                                   setEditStudentCustomTasks(prev => prev.filter(t => t.id !== task.id || t.lesson !== editPopupLesson));
                                   setEditStudentAssignedItems(prev => prev.filter(k => k !== assignKey));
                               }} style={{background:'none', border:'none', color:'var(--accent-red)', cursor:'pointer', fontSize:'0.75rem', padding: '0 0.5rem'}}>삭제</button>
                             </label>
                           );
                         })}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (editingStudentId) {
                        removeStudent(editingStudentId, editStudentName);
                        setEditingStudentId(null);
                        setEditPopupPosition(null);
                      }
                    }} 
                    className="btn btn-danger" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    삭제
                  </button>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingStudentId(null);
                        setEditPopupPosition(null);
                      }} 
                      className="btn" 
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      취소
                    </button>
                    <button type="submit" className="btn" style={{ backgroundColor: 'var(--accent-blue)', color: 'white', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      저장
                    </button>
                  </div>
                </div>
              </form>
            </div>
            );
            })()}
          </div>
        )}

      </div>
      
      {/* Print Overlay Modal (No Print) */}
      {printStudentId && (() => {
         const pStudent = students.find(s => s.id === printStudentId);
         if (!pStudent) return null;
         const myProgress = calculateStudentProgress(pStudent).overallPct;
         const gradeAvg = getGradeAverageProgress(pStudent.grade);
         
         return (
           <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999}} onClick={() => setPrintStudentId(null)}>
              <div className="card fade-in" style={{ width: '500px', maxWidth: '95vw', padding: '2rem' }} onClick={e => e.stopPropagation()}>
                 <h2 className="title" style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>결과지 인쇄</h2>
                 <div style={{ marginBottom: '1rem' }}>
                    <strong>{pStudent.name}</strong> ({pStudent.school} {pStudent.grade} {pStudent.studentClass})
                 </div>
                 <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                    <span>종합 달성률: <strong style={{ color: 'var(--accent-blue)', fontSize: '1.2rem' }}>{myProgress}%</strong></span>
                    <span style={{ color: 'var(--text-secondary)' }}>동학년 평균: {gradeAvg}%</span>
                 </div>
                 
                 <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>푸는 속도 (성실도)</label>
                    <select className="select" style={{ width: '100%', padding: '0.7rem' }} value={printSpeed} onChange={e => setPrintSpeed(e.target.value)}>
                       <option value="매우 빠름">매우 빠름</option>
                       <option value="빠름">빠름</option>
                       <option value="보통">보통</option>
                       <option value="느린 편">느린 편</option>
                       <option value="도움 필요">도움 필요</option>
                    </select>
                 </div>
                 
                 <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>선생님 코멘트 (선택)</label>
                    <textarea 
                      className="input" 
                      style={{ height: '120px', resize: 'vertical' }}
                      value={printComment}
                      onChange={e => setPrintComment(e.target.value)}
                      placeholder="학부모, 학생에게 전달할 코멘트를 작성해주세요."
                    />
                 </div>
                 
                 <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn" onClick={() => setPrintStudentId(null)}>취소</button>
                    <button className="btn btn-primary" onClick={() => window.print()}>명세서 인쇄</button>
                 </div>
              </div>
           </div>
         );
      })()}

      {/* Actual Print Content Component (Only visible when printing) */}
      <div id="print-section" style={{ display: 'none' }}>
        {printStudentId && (() => {
           const pStudent = students.find(s => s.id === printStudentId);
           if (!pStudent) return null;
           const myProgress = calculateStudentProgress(pStudent).overallPct;
           const gradeAvg = getGradeAverageProgress(pStudent.grade);
           return (
             <div style={{ color: 'black', fontFamily: '-apple-system, sans-serif' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                   <h1 style={{ fontSize: '28px', margin: 0 }}>내신대비 결과 보고서</h1>
                   <span style={{ fontSize: '18px', display: 'flex', alignItems: 'flex-end' }}>{pStudent.school} {pStudent.grade}</span>
                 </div>
                 
                 <div style={{ marginTop: '20px', fontSize: '20px' }}>
                   <strong>이름:</strong> <span style={{ fontSize: '24px'}}>{pStudent.name}</span> {pStudent.studentClass && `(${pStudent.studentClass})`}
                 </div>
                 
                 <div style={{ marginTop: '30px', display: 'flex', gap: '20px' }}>
                   <div style={{ flex: 1, border: '1px solid #ddd', padding: '20px', borderRadius: '12px' }}>
                     <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#555' }}>전체 과정 달성률</h3>
                     <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#007AFF' }}>{myProgress}%</div>
                     <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                       (동학년 평균 대비: {myProgress >= gradeAvg ? '+' : ''}{myProgress - gradeAvg}%)
                     </div>
                   </div>
                   
                   <div style={{ flex: 1, border: '1px solid #ddd', padding: '20px', borderRadius: '12px' }}>
                     <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#555' }}>학습 참여 속도 및 성실도</h3>
                     <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#34C759', marginTop: '10px' }}>{printSpeed}</div>
                   </div>
                 </div>

                 <div style={{ marginTop: '30px', border: '1px solid #ddd', padding: '25px', minHeight: '300px', borderRadius: '12px' }}>
                   <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px', fontSize: '20px' }}>Tutors' Comment</h3>
                   <div style={{ fontSize: '18px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                     {printComment || '이번 시험 대비를 위해 열심히 공부하고 있습니다!'}
                   </div>
                 </div>
                 
                 <div style={{ marginTop: '60px', textAlign: 'center', color: '#888', fontSize: '14px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                   윌그로우 내신대비 마스터 시스템
                 </div>
             </div>
           );
        })()}
      </div>

    </>
  );
}

export default App;
