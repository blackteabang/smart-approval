import React, { useState } from 'react';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  mockUsers: User[];
  onSignUp: (newUser: User) => void;
}

/**
 * 인증 화면 컴포넌트
 * - 로그인 및 회원가입 기능을 제공합니다.
 * - 로그인: 휴대폰 번호(ID)와 비밀번호로 인증
 * - 회원가입: 신규 사용자 정보 입력 및 중복 확인
 */
const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, mockUsers, onSignUp }) => {
  const [isLogin, setIsLogin] = useState(true); // 로그인/회원가입 모드 전환
  const [formData, setFormData] = useState({
    name: '',
    position: '사원',
    department: '영업부',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  /**
   * 인증 처리 핸들러 (로그인/회원가입 분기)
   */
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // 로그인 처리
      // 휴대폰 번호 정규화 (하이픈 제거), 단 'admin' 계정은 예외 처리
      const inputPhone = formData.phone === 'admin' ? 'admin' : formData.phone.replace(/-/g, '');
      
      const user = mockUsers.find(u => {
        const userPhone = u.phone === 'admin' ? 'admin' : u.phone.replace(/-/g, '');
        return userPhone === inputPhone && u.password === formData.password;
      });

      if (user) {
        onLogin(user);
      } else {
        setError('아이디(연락처) 또는 비밀번호가 올바르지 않습니다.');
      }
    } else {
      // 회원가입 처리
      // 기본 유효성 검사
      if (!formData.name || !formData.phone || !formData.password) {
        setError('모든 필드를 입력해주세요.');
        return;
      }
      
      // 중복 휴대폰 번호 확인 (정규화 후 비교)
      const inputPhone = formData.phone.replace(/-/g, '');
      if (mockUsers.some(u => u.phone.replace(/-/g, '') === inputPhone)) {
        setError('이미 등록된 휴대폰 번호입니다.');
        return;
      }

      const newUser: User = {
        id: `u-${Date.now()}`,
        name: formData.name,
        position: formData.position,
        department: formData.department,
        phone: formData.phone, // 입력된 형식 그대로 저장 (또는 정규화하여 저장 가능)
        password: formData.password,
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
        role: 'USER' // 기본 권한은 일반 사용자
      };
      onSignUp(newUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 mb-6">
            <span className="text-3xl text-white">⚡</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">리맨전자결재</h1>
          <p className="text-slate-500 mt-2">기업용 인공지능 전자결재 시스템</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8 overflow-hidden relative">
          <div className="flex mb-8 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              로그인
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">이름</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="홍길동"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">부서</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="영업부"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">직급</label>
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                    >
                      <option>사원</option>
                      <option>대리</option>
                      <option>과장</option>
                      <option>차장</option>
                      <option>부장</option>
                      <option>이사</option>
                      <option>상무</option>
                      <option>대표이사</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                {isLogin ? '아이디 (연락처)' : '연락처'}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="010-0000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">비밀번호</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-bold animate-pulse">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all mt-4"
            >
              {isLogin ? '로그인하기' : '회원가입 완료'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
               Smart Approval System © 2024 리맨전자결재
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
