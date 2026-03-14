import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Student, LoginRecord, SchoolExamDate, StudentComment } from './types';
import { CHECKLIST_CATEGORIES, ALL_CHECKLIST_ITEMS, SCHOOLS, GRADES } from './types';
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
  const [editPopupPosition, setEditPopupPosition] = useState<{ top: number, left: number } | null>(null);

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSchool, setNewStudentSchool] = useState(SCHOOLS[1]); // default to first real school
  const [newStudentGrade, setNewStudentGrade] = useState(GRADES[1]); // default to first real grade
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState(SCHOOLS[0]); // default '전체'
  const [filterGrade, setFilterGrade] = useState(GRADES[0]); // default '전체'

  const [selectedStudentIdForComments, setSelectedStudentIdForComments] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

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
      progress: {},
    };

    try {
      await setDoc(doc(db, 'students', newId), newStudent);
      setNewStudentName('');
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
        grade: editStudentGrade
      });
      logActivity(currentUser, `학생 '${editStudentName}' 정보 수정`);
      setEditingStudentId(null);
    } catch (error) {
      console.error("Error updating student:", error);
      alert("학생 정보 수정 중 오류가 발생했습니다.");
    }
  };

  const toggleProgress = async (studentId: string, studentName: string, itemId: string, currentState: boolean) => {
    const itemLabel = ALL_CHECKLIST_ITEMS.find(i => i.id === itemId)?.label || itemId;
    const actionDesc = `학생 '${studentName}'의 [${itemLabel}] ${!currentState ? '완료 처리' : '완료 해제'}`;
    
    try {
      // Create a dot notation key for Firestore to update only the specific nested field
      const updateKey = `progress.${itemId}`;
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
           studentData.progress[itemId] = {
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
    const total = ALL_CHECKLIST_ITEMS.length;
    let completed = 0;
    ALL_CHECKLIST_ITEMS.forEach(item => {
      const progressData = student.progress && student.progress[item.id];
      const isLegacyBoolean = typeof progressData === 'boolean';
      // @ts-ignore - Handle legacy boolean format
      const isChecked = isLegacyBoolean ? progressData : (progressData?.isChecked ?? false);
      if (isChecked) completed++;
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
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

  const handleManualSync = async () => {
    try {
      console.log('수동 동기화 시작...');
      const promises: Promise<void>[] = [];
      
      // Sync all students
      students.forEach(student => {
        promises.push(setDoc(doc(db, 'students', student.id), student));
      });
      // Sync all exam dates
      examDates.forEach(dateReq => {
        promises.push(setDoc(doc(db, 'exam_dates', `${dateReq.school}_${dateReq.grade}`), dateReq));
      });
      
      await Promise.all(promises);
      console.log('수동 동기화 완료');
    } catch (error) {
      console.error("수동 동기화 실패:", error);
      alert("동기화 중 오류가 발생했습니다.");
    }
  };

  const handleLogout = async () => {
    await handleManualSync();
    logActivity(currentUser, '전체 데이터 동기화 및 로그아웃');
    alert("모든 데이터가 안전하게 서버에 동기화(저장)되었습니다. 로그아웃합니다.");
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
          <img src="/윌그로우로고.png" alt="윌그로우 로고" style={{ height: '40px', marginBottom: '1rem', objectFit: 'contain' }} />
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = filterSchool === '전체' || student.school === filterSchool;
    const matchesGrade = filterGrade === '전체' || student.grade === filterGrade;
    return matchesSearch && matchesSchool && matchesGrade;
  });

  const studentsWithProgress = students.map(student => ({
    ...student,
    progressPct: calculateStudentProgress(student)
  }));
  
  // Exclude students with 0% from bottom if they just started? Or keep it literal? 
  // Let's keep it literal and just sort. To resolve ties it's stable enough.
  const sortedByProgressDesc = [...studentsWithProgress].sort((a, b) => b.progressPct - a.progressPct);
  const top3Students = sortedByProgressDesc.slice(0, 3);
  
  // To avoid showing the exact same top 3 in bottom 3 if there are very few students,
  // we can just reverse, but normally we just take the last 3 or sort ascending.
  const sortedByProgressAsc = [...studentsWithProgress].sort((a, b) => a.progressPct - b.progressPct);
  const bottom3Students = sortedByProgressAsc.slice(0, 3);

  return (
    <div className="container fade-in">
      <header className="flex-col items-center justify-center gap-3" style={{ marginBottom: '2.5rem', textAlign: 'center', position: 'relative' }}>
        <img src="/윌그로우로고.png" alt="윌그로우 로고" style={{ height: '50px', marginBottom: '0.5rem', objectFit: 'contain' }} />
        <h1 className="title">내신 대비 마스터</h1>
        <p className="subtitle">학생 진행도 트래커</p>
        
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              접속자: <strong>{currentUser}</strong>
            </span>
            <button onClick={handleManualSync} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }}>
              수동 동기화
            </button>
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
        <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
           <button 
             onClick={() => setShowExamDateModal(true)} 
             className="btn" 
             style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            학교별 시험일 설정
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            style={{ maxWidth: '200px' }}
            placeholder="새로운 학생 이름..."
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
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

        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input search-input"
            style={{ flex: 1, minWidth: '200px' }}
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
        </div>

        {/* Ranking Dashboard */}
        {students.length > 0 && (
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {/* Top 3 */}
            <div style={{ flex: 1, minWidth: '250px', backgroundColor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '12px', padding: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#2e7d32', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏆 달성율 RANK TOP 3
              </h3>
              <ol style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {top3Students.map((s) => (
                  <li key={s.id}>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{s.name}</span> ({s.school} {s.grade}) - <strong style={{ color: '#2e7d32' }}>{s.progressPct}%</strong>
                  </li>
                ))}
              </ol>
            </div>
            
            {/* Bottom 3 */}
            <div style={{ flex: 1, minWidth: '250px', backgroundColor: 'rgba(244, 67, 54, 0.05)', border: '1px solid rgba(244, 67, 54, 0.2)', borderRadius: '12px', padding: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#c62828', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚨 달성율 HURRY UP BOTTOM 3
              </h3>
              <ol style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {bottom3Students.map((s) => (
                  <li key={s.id}>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{s.name}</span> ({s.school} {s.grade}) - <strong style={{ color: '#c62828' }}>{s.progressPct}%</strong>
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
                {CHECKLIST_CATEGORIES.map(category => (
                  <th key={category.title} colSpan={category.items.length} className="category-header">
                    {category.title}
                  </th>
                ))}
                <th rowSpan={2} style={{ minWidth: '80px' }}>관리</th>
              </tr>
              <tr>
                {CHECKLIST_CATEGORIES.flatMap(cat => cat.items).map(item => (
                  <th key={item.id} title={item.label} style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-primary)' }}>
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={ALL_CHECKLIST_ITEMS.length + 2} style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다. 학생을 추가해주세요.'}
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
                            {dDayText && <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px', backgroundColor: dDayText === '시험 종료' ? 'var(--bg-secondary)' : 'var(--accent-red)', color: dDayText === '시험 종료' ? 'var(--text-secondary)' : 'white', cursor: 'default' }}>{dDayText}</span>}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {student.school} {student.grade} • {progressPct}% 달성
                          </span>
                          <div className="progress-wrapper">
                            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </td>
                      {ALL_CHECKLIST_ITEMS.map(item => {
                        const progressState = student.progress && student.progress[item.id];
                        const isLegacyBoolean = typeof progressState === 'boolean';
                        // @ts-ignore
                        const isChecked = isLegacyBoolean ? progressState : (progressState?.isChecked ?? false);
                        
                        let tooltip = `${student.name} - ${item.label}`;
                        if (isChecked) {
                          if (isLegacyBoolean) {
                            tooltip = `${student.name} - ${item.label} (선생님/시간 기록 없음)`;
                          } else if (progressState) {
                            // @ts-ignore
                            tooltip = `체크: ${progressState.updatedBy}\n일시: ${formatDate(progressState.updatedAt || 0)}`;
                          }
                        }
                          
                        return (
                          <td key={item.id}>
                            <input
                              type="checkbox"
                              title={tooltip}
                              className="check-toggle"
                              checked={isChecked}
                              onChange={() => toggleProgress(student.id, student.name, item.id, isChecked)}
                            />
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button 
                          onClick={(e) => openEditStudentModal(e, student)} 
                          className="btn" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', marginRight: '4px' }}
                          title="학생 정보 수정"
                        >
                          수정
                        </button>
                        <button 
                          onClick={() => removeStudent(student.id, student.name)}
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          title="학생 삭제"
                        >
                          삭제
                        </button>
                      </td>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card fade-in" style={{ width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card fade-in" style={{ width: '450px', maxHeight: '80vh', overflowY: 'auto' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card fade-in" style={{ width: '400px', textAlign: 'center' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card fade-in" style={{ width: '400px', textAlign: 'center' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card fade-in" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
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

        {/* Edit Student Popup */}
        {editingStudentId && editPopupPosition && (
          <div 
            className="card fade-in" 
            style={{ 
              position: 'fixed', 
              top: editPopupPosition.top, 
              left: editPopupPosition.left, 
              width: '280px', 
              zIndex: 9999, 
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              border: '1px solid var(--border-color)',
              padding: '1.2rem'
            }}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
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
              </form>
          </div>
        )}

    </div>
  );
}

export default App;
