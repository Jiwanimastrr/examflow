import React, { useState, useEffect } from 'react';
import type { Student } from './types';
import { CHECKLIST_CATEGORIES, ALL_CHECKLIST_ITEMS, SCHOOLS, GRADES } from './types';
import './index.css';

const LOCAL_STORAGE_KEY = 'exam-tracker-students';

function App() {
  const [currentUser, setCurrentUser] = useState('');
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSchool, setNewStudentSchool] = useState(SCHOOLS[1]); // default to first real school
  const [newStudentGrade, setNewStudentGrade] = useState(GRADES[1]); // default to first real grade
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState(SCHOOLS[0]); // default '전체'
  const [filterGrade, setFilterGrade] = useState(GRADES[0]); // default '전체'

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setStudents(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved students', e);
      }
    }
  }, []);

  // Save to local storage when students change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  const addStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStudentName.trim();
    if (!name) return;

    const newStudent: Student = {
      id: crypto.randomUUID(),
      name,
      school: newStudentSchool,
      grade: newStudentGrade,
      progress: {},
    };

    setStudents([...students, newStudent]);
    setNewStudentName('');
  };

  const removeStudent = (id: string) => {
    if (window.confirm('정말 이 학생을 삭제하시겠습니까?')) {
      setStudents(students.filter(s => s.id !== id));
    }
  };

  const toggleProgress = (studentId: string, itemId: string) => {
    setStudents(current =>
      current.map(student => {
        if (student.id !== studentId) return student;
        
        const currentState = student.progress[itemId]?.isChecked ?? false;
        
        return {
          ...student,
          progress: {
            ...student.progress,
            [itemId]: {
              isChecked: !currentState,
              updatedBy: currentUser,
              updatedAt: Date.now()
            }
          }
        };
      })
    );
  };

  const calculateStudentProgress = (student: Student) => {
    const total = ALL_CHECKLIST_ITEMS.length;
    let completed = 0;
    ALL_CHECKLIST_ITEMS.forEach(item => {
      if (student.progress[item.id]?.isChecked) completed++;
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = filterSchool === '전체' || student.school === filterSchool;
    const matchesGrade = filterGrade === '전체' || student.grade === filterGrade;
    return matchesSearch && matchesSchool && matchesGrade;
  });

  const handleLogin = (e: React.FormEvent) => {
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
      setLoginPasswordInput(''); // Clear password on success
    } else {
      setLoginError('이름을 입력해주세요.');
    }
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

  return (
    <div className="container fade-in">
      <header className="flex-col items-center justify-center gap-3" style={{ marginBottom: '2.5rem', textAlign: 'center', position: 'relative' }}>
        <img src="/윌그로우로고.png" alt="윌그로우 로고" style={{ height: '50px', marginBottom: '0.5rem', objectFit: 'contain' }} />
        <h1 className="title">이그잼포유 내신대비</h1>
        <p className="subtitle">학생 진행도 트래커</p>
        
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            접속자: <strong>{currentUser}</strong>
          </span>
          <button onClick={() => setCurrentUser('')} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            변경
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
                  return (
                    <tr key={student.id}>
                      <td className="student-name-col">
                        <div className="flex flex-col gap-1">
                          <span style={{ fontSize: '1.05rem' }}>{student.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {student.school} {student.grade} • {progressPct}% 달성
                          </span>
                          <div className="progress-wrapper">
                            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </td>
                      {ALL_CHECKLIST_ITEMS.map(item => {
                        const progressState = student.progress[item.id];
                        const isChecked = progressState?.isChecked ?? false;
                        const tooltip = isChecked && progressState 
                          ? `체크: ${progressState.updatedBy}\n일시: ${formatDate(progressState.updatedAt)}` 
                          : `${student.name} - ${item.label}`;
                          
                        return (
                          <td key={item.id}>
                            <input
                              type="checkbox"
                              title={tooltip}
                              className="check-toggle"
                              checked={isChecked}
                              onChange={() => toggleProgress(student.id, item.id)}
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
    </div>
  );
}

export default App;
