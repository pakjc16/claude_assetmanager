import React, { useState } from 'react';
import { Building2, LogIn, Eye, EyeOff, User, Lock, ChevronRight } from 'lucide-react';
import { AppUser, CompanyInfo, UserRole } from '../types';

interface LoginPageProps {
  users: AppUser[];
  companyInfo: CompanyInfo;
  onLogin: (user: AppUser) => void;
  onSetup: (company: CompanyInfo, adminUser: AppUser) => void;
}

const AVATAR_COLORS = ['#1a73e8', '#34a853', '#ea4335', '#fbbc05', '#9c27b0', '#ff6f00'];
const digitsOnly = (s: string) => (s || '').replace(/[^0-9]/g, '');
const fmtPhone = (v: string): string => {
  const d = digitsOnly(v);
  if (/^01[016789]/.test(d)) { if (d.length <= 3) return d; if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`; return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7,11)}`; }
  if (d.startsWith('02')) { if (d.length <= 2) return d; if (d.length <= 5) return `${d.slice(0,2)}-${d.slice(2)}`; if (d.length <= 9) return `${d.slice(0,2)}-${d.slice(2,d.length-4)}-${d.slice(d.length-4)}`; return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6,10)}`; }
  if (d.length >= 3 && /^0[3-6][0-9]/.test(d)) { if (d.length <= 3) return d; if (d.length <= 6) return `${d.slice(0,3)}-${d.slice(3)}`; if (d.length <= 10) return `${d.slice(0,3)}-${d.slice(3,d.length-4)}-${d.slice(d.length-4)}`; return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7,11)}`; }
  if (/^1[0-9]{3}/.test(d)) { if (d.length <= 4) return d; return `${d.slice(0,4)}-${d.slice(4,8)}`; }
  return d;
};

export const LoginPage: React.FC<LoginPageProps> = ({ users, companyInfo, onLogin, onSetup }) => {
  const isFirstSetup = users.length === 0;

  // 로그인 폼
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  // 초기설정 폼
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [setupCompany, setSetupCompany] = useState<Omit<CompanyInfo, 'logoBase64'>>({
    name: '', businessRegNumber: '', representative: '', phone: '', email: '', website: '',
  });
  const [setupAdmin, setSetupAdmin] = useState({
    username: '', name: '', password: '', confirmPw: '', email: '',
  });
  const [showSetupPw, setShowSetupPw] = useState(false);

  const handleLogin = () => {
    setError('');
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력하세요.');
      return;
    }
    const user = users.find(u => u.username === username && u.passwordHash === btoa(password));
    if (!user) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    if (!user.isActive) {
      setError('비활성화된 계정입니다. 관리자에게 문의하세요.');
      return;
    }
    onLogin(user);
  };

  const handleSetupNext = () => {
    setError('');
    if (!setupCompany.name.trim()) {
      setError('회사명을 입력하세요.');
      return;
    }
    setSetupStep(2);
  };

  const handleSetupFinish = () => {
    setError('');
    if (!setupAdmin.username.trim() || !setupAdmin.name.trim()) {
      setError('아이디와 표시 이름을 입력하세요.');
      return;
    }
    if (setupAdmin.password.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    if (setupAdmin.password !== setupAdmin.confirmPw) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    const admin: AppUser = {
      id: Date.now().toString(),
      username: setupAdmin.username.trim(),
      name: setupAdmin.name.trim(),
      email: setupAdmin.email.trim() || undefined,
      passwordHash: btoa(setupAdmin.password),
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      avatarColor: AVATAR_COLORS[0],
    };
    onSetup({ ...setupCompany }, admin);
  };

  // ── 초기 설정 화면 ──
  if (isFirstSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e8f0fe] via-[#f1f8ff] to-[#f8f9fa] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* 카드 */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] px-8 py-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Building2 size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">RealtyFlow</h1>
              <p className="text-sm text-blue-100 mt-1">처음 실행하셨습니다 — 초기 설정을 완료하세요</p>
            </div>

            {/* 스텝 인디케이터 */}
            <div className="flex px-8 pt-6 gap-2">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${setupStep >= 1 ? 'bg-[#1a73e8]' : 'bg-[#e8eaed]'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${setupStep >= 2 ? 'bg-[#1a73e8]' : 'bg-[#e8eaed]'}`} />
            </div>

            <div className="px-8 py-6 space-y-4">
              {/* 스텝 1: 회사 정보 */}
              {setupStep === 1 && (
                <>
                  <div>
                    <p className="text-sm font-black text-[#202124] mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#1a73e8] text-white text-xs flex items-center justify-center font-black">1</span>
                      회사 정보 입력
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">회사명 <span className="text-[#ea4335]">*</span></label>
                        <input
                          value={setupCompany.name}
                          onChange={e => setSetupCompany(p => ({ ...p, name: e.target.value }))}
                          placeholder="예: (주)리얼티플로우"
                          className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] outline-none transition-all"
                          onKeyDown={e => e.key === 'Enter' && handleSetupNext()}
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#5f6368] mb-1 block">사업자등록번호</label>
                          <input
                            value={setupCompany.businessRegNumber}
                            onChange={e => setSetupCompany(p => ({ ...p, businessRegNumber: e.target.value }))}
                            placeholder="000-00-00000"
                            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#5f6368] mb-1 block">대표자명</label>
                          <input
                            value={setupCompany.representative}
                            onChange={e => setSetupCompany(p => ({ ...p, representative: e.target.value }))}
                            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#5f6368] mb-1 block">대표 전화</label>
                          <input
                            value={fmtPhone(setupCompany.phone)}
                            onChange={e => setSetupCompany(p => ({ ...p, phone: digitsOnly(e.target.value) }))}
                            placeholder="02-0000-0000"
                            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#5f6368] mb-1 block">이메일</label>
                          <input
                            type="email"
                            value={setupCompany.email}
                            onChange={e => setSetupCompany(p => ({ ...p, email: e.target.value }))}
                            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {error && <p className="text-xs text-[#ea4335] bg-[#fce8e6] px-3 py-2 rounded-lg">{error}</p>}
                  <button
                    onClick={handleSetupNext}
                    className="w-full py-2.5 bg-[#1a73e8] text-white font-bold rounded-lg hover:bg-[#1557b0] transition-colors flex items-center justify-center gap-2"
                  >
                    다음 <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* 스텝 2: 관리자 계정 */}
              {setupStep === 2 && (
                <>
                  <div>
                    <p className="text-sm font-black text-[#202124] mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#1a73e8] text-white text-xs flex items-center justify-center font-black">2</span>
                      관리자 계정 생성
                    </p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#5f6368] mb-1 block">아이디 <span className="text-[#ea4335]">*</span></label>
                          <input
                            value={setupAdmin.username}
                            onChange={e => setSetupAdmin(p => ({ ...p, username: e.target.value }))}
                            placeholder="로그인 아이디"
                            autoFocus
                            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#5f6368] mb-1 block">표시 이름 <span className="text-[#ea4335]">*</span></label>
                          <input
                            value={setupAdmin.name}
                            onChange={e => setSetupAdmin(p => ({ ...p, name: e.target.value }))}
                            placeholder="화면에 표시될 이름"
                            className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">이메일</label>
                        <input
                          type="email"
                          value={setupAdmin.email}
                          onChange={e => setSetupAdmin(p => ({ ...p, email: e.target.value }))}
                          className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                        />
                      </div>
                      <div className="relative">
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">비밀번호 <span className="text-[#ea4335]">*</span></label>
                        <input
                          type={showSetupPw ? 'text' : 'password'}
                          value={setupAdmin.password}
                          onChange={e => setSetupAdmin(p => ({ ...p, password: e.target.value }))}
                          className="w-full border border-[#dadce0] rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                        />
                        <button type="button" onClick={() => setShowSetupPw(!showSetupPw)} className="absolute right-3 bottom-2 text-[#5f6368]">
                          {showSetupPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#5f6368] mb-1 block">비밀번호 확인 <span className="text-[#ea4335]">*</span></label>
                        <input
                          type="password"
                          value={setupAdmin.confirmPw}
                          onChange={e => setSetupAdmin(p => ({ ...p, confirmPw: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleSetupFinish()}
                          className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  {error && <p className="text-xs text-[#ea4335] bg-[#fce8e6] px-3 py-2 rounded-lg">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSetupStep(1); setError(''); }}
                      className="flex-1 py-2.5 border border-[#dadce0] text-[#5f6368] font-bold rounded-lg hover:bg-[#f1f3f4] transition-colors"
                    >
                      이전
                    </button>
                    <button
                      onClick={handleSetupFinish}
                      className="flex-1 py-2.5 bg-[#34a853] text-white font-bold rounded-lg hover:bg-[#2d7d46] transition-colors"
                    >
                      설정 완료
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-[#5f6368] mt-4">RealtyFlow — 임대 부동산 자산 관리</p>
        </div>
      </div>
    );
  }

  // ── 일반 로그인 화면 ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f0fe] via-[#f1f8ff] to-[#f8f9fa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] px-8 py-8 text-white text-center">
            {companyInfo.logoBase64 ? (
              <img src={companyInfo.logoBase64} alt="로고" className="w-16 h-16 rounded-2xl object-contain mx-auto mb-4 bg-white/20 p-2" />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Building2 size={32} className="text-white" />
              </div>
            )}
            <h1 className="text-xl font-black tracking-tight">{companyInfo.name || 'RealtyFlow'}</h1>
            <p className="text-xs text-blue-100 mt-1">부동산 자산 관리 시스템</p>
          </div>

          {/* 로그인 폼 */}
          <div className="px-8 py-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-[#5f6368] mb-1 flex items-center gap-1">
                <User size={11} /> 아이디
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
                placeholder="아이디를 입력하세요"
                className="w-full border border-[#dadce0] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#5f6368] mb-1 flex items-center gap-1">
                <Lock size={11} /> 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8] outline-none transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-[#5f6368] hover:text-[#3c4043]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-[#ea4335] bg-[#fce8e6] px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              onClick={handleLogin}
              className="w-full py-2.5 bg-[#1a73e8] text-white font-bold rounded-lg hover:bg-[#1557b0] transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> 로그인
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-[#9aa0a6] mt-4">RealtyFlow — 임대 부동산 자산 관리</p>
      </div>
    </div>
  );
};
