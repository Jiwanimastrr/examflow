import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Student, LoginRecord, SchoolExamDate } from './types';
import { CHECKLIST_CATEGORIES, ALL_CHECKLIST_ITEMS, SCHOOLS, GRADES } from './types';
import './index.css';

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
  
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSchool, setNewStudentSchool] = useState(SCHOOLS[1]); // default to first real school
  const [newStudentGrade, setNewStudentGrade] = useState(GRADES[1]); // default to first real grade
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState(SCHOOLS[0]); // default '전체'
  const [filterGrade, setFilterGrade] = useState(GRADES[0]); // default '전체'

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
    } catch (error) {
      console.error("Error adding student:", error);
      alert("학생 추가 중 오류가 발생했습니다.");
    }
  };

  const removeStudent = async (id: string) => {
    if (window.confirm('정말 이 학생을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
      } catch (error) {
        console.error("Error removing student:", error);
      }
    }
  };

  const toggleProgress = async (studentId: string, itemId: string, currentState: boolean) => {
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
      if (student.progress && student.progress[item.id]?.isChecked) completed++;
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
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
      try {
        const newRecord: LoginRecord = {
          id: crypto.randomUUID(),
          name: capitalizedName,
          timestamp: Date.now()
        };
        await setDoc(doc(db, 'login_history', newRecord.id), newRecord);
      } catch (e) {
        console.warn("Failed to log login history", e);
      }
    } else {
      setLoginError('이름을 입력해주세요.');
    }
  };

  const updateExamDate = async (school: string, dateStr: string) => {
    try {
      await setDoc(doc(db, 'exam_dates', school), { school, dateStr });
    } catch (error) {
      console.error("Error updating exam date:", error);
    }
  };

  const calculateDDay = (school: string) => {
    const examDate = examDates.find(d => d.school === school);
    if (!examDate || !examDate.dateStr) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(examDate.dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `D-${diffDays}`;
    if (diffDays === 0) return `D-Day`;
    return `D+${Math.abs(diffDays)}`;
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

  return (
    <div className="container fade-in">
      <header className="flex-col items-center justify-center gap-3" style={{ marginBottom: '2.5rem', textAlign: 'center', position: 'relative' }}>
        <img src="/윌그로우로고.png" alt="윌그로우 로고" style={{ height: '50px', marginBottom: '0.5rem', objectFit: 'contain' }} />
        <h1 className="title">이그잼포유 내신대비</h1>
        <p className="subtitle">학생 진행도 트래커</p>
        
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              접속자: <strong>{currentUser}</strong>
            </span>
            <button onClick={() => setCurrentUser('')} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              변경
            </button>
          </div>
          <button 
             onClick={() => setShowLoginHistoryModal(true)} 
             className="btn" 
             style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}>
            최근 접속 기록 보기
          </button>
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0 }}>
             <button 
             onClick={() => setShowExamDateModal(true)} 
             className="btn" 
             style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            학교별 시험일 설정
          </button>
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
                  const dDayText = calculateDDay(student.school);
                  
                  return (
                    <tr key={student.id}>
                      <td className="student-name-col">
                        <div className="flex flex-col gap-1">
                          <span style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {student.name}
                            {dDayText && <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px', backgroundColor: dDayText.includes('+') ? 'var(--bg-secondary)' : 'var(--accent-red)', color: dDayText.includes('+') ? 'var(--text-secondary)' : 'white' }}>{dDayText}</span>}
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
                        const isChecked = progressState?.isChecked ?? false;
                        const tooltip = isChecked && progressState 
                          ? `체크: ${progressState.updatedBy}\n일시: ${formatDate(progressState.updatedAt || 0)}` 
                          : `${student.name} - ${item.label}`;
                          
                        return (
                          <td key={item.id}>
                            <input
                              type="checkbox"
                              title={tooltip}
                              className="check-toggle"
                              checked={isChecked}
                              onChange={() => toggleProgress(student.id, item.id, isChecked)}
                            />
                          </td>
                        );
                      })}
                      <td>
                        <button 
                          onClick={() => removeStudent(student.id)}
                          className="btn btn-danger"
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
              <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>최근 접속 기록</h2>
              <button onClick={() => setShowLoginHistoryModal(false)} className="btn" style={{ padding: '0.3rem 0.6rem' }}>닫기</button>
            </div>
            {loginHistory.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>기록이 없습니다.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {loginHistory.slice(0, 30).map((record, idx) => (
                  <li key={record.id || idx} style={{ padding: '0.8rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500' }}>{record.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDate(record.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Exam Date Modal */}
      {showExamDateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card fade-in" style={{ width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>학교별 시험일 설정</h2>
              <button onClick={() => setShowExamDateModal(false)} className="btn" style={{ padding: '0.3rem 0.6rem' }}>닫기</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {SCHOOLS.filter(s => s !== '전체').map(school => {
                const currentSetting = examDates.find(d => d.school === school);
                return (
                  <div key={school} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '500' }}>{school}</span>
                    <input 
                      type="date"
                      className="input"
                      style={{ width: 'auto' }}
                      value={currentSetting?.dateStr || ''}
                      onChange={(e) => updateExamDate(school, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
