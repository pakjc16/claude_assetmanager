
import React, { useState, useMemo, useRef } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { StatsCard } from './StatsCard';
import { Building2, Wallet, AlertTriangle, Settings, X, Layers, TrendingUp, CheckCircle, AlertCircle, ArrowDownLeft, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { DashboardFinancials, LeaseContract, Property, Unit, ValuationHistory, Facility, PaymentTransaction, Stakeholder, MaintenanceContract, UtilityContract } from '../types';

interface DashboardProps {
  financials: DashboardFinancials;
  properties: Property[];
  contracts: LeaseContract[];
  units: Unit[];
  valuations: ValuationHistory[];
  facilities: Facility[];
  transactions: PaymentTransaction[];
  stakeholders: Stakeholder[];
  maintenanceContracts: MaintenanceContract[];
  utilityContracts: UtilityContract[];
  formatMoney: (amount: number) => string;
}

type WidgetCategory = 'FINANCE' | 'ASSET' | 'OPERATION' | 'FACILITY' | 'SCHEDULE';

// ──────────────────────────────────────────────
// 주요 이슈 캘린더 위젯
// ──────────────────────────────────────────────
type EventCategory = 'LEASE_END' | 'LEASE_START' | 'LEASE_RENEWAL' | 'PAYMENT_DUE' | 'FACILITY_INSP' | 'MAINT_END' | 'UTIL_PAYMENT';

interface CalendarEvent { id: string; date: string; title: string; category: EventCategory; detail?: string; }

const EVENT_META: Record<EventCategory, { label: string; color: string; dot: string }> = {
  LEASE_END:     { label: '임대 종료',   color: 'bg-red-50 text-red-700 border-red-200',         dot: '#ef4444' },
  LEASE_START:   { label: '임대 시작',   color: 'bg-green-50 text-green-700 border-green-200',   dot: '#22c55e' },
  LEASE_RENEWAL: { label: '계약 갱신',   color: 'bg-blue-50 text-[#1a73e8] border-blue-200',     dot: '#1a73e8' },
  PAYMENT_DUE:   { label: '납입 기한',   color: 'bg-orange-50 text-orange-700 border-orange-100', dot: '#f97316' },
  FACILITY_INSP: { label: '시설 점검',   color: 'bg-purple-50 text-purple-700 border-purple-200', dot: '#9333ea' },
  MAINT_END:     { label: '용역 만료',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: '#6366f1' },
  UTIL_PAYMENT:  { label: '공과금 납부', color: 'bg-teal-50 text-teal-700 border-teal-200',       dot: '#14b8a6' },
};

const ALL_CATEGORIES = Object.keys(EVENT_META) as EventCategory[];
const padZ = (n: number) => String(n).padStart(2, '0');
const toDateStr = (y: number, m: number, d: number) => `${y}-${padZ(m + 1)}-${padZ(d)}`;

const EventCalendarWidget: React.FC<DashboardProps> = ({ contracts, transactions, facilities, maintenanceContracts, utilityContracts, stakeholders }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [activeFilters, setActiveFilters] = useState<Set<EventCategory>>(new Set(ALL_CATEGORIES));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const toggleFilter = (cat: EventCategory) =>
    setActiveFilters(prev => { const s = new Set(prev); s.has(cat) ? s.delete(cat) : s.add(cat); return s; });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const events = useMemo<CalendarEvent[]>(() => {
    const all: CalendarEvent[] = [];
    contracts.forEach(c => {
      if (c.status === 'TERMINATED') return;
      const latestTerm = c.terms[c.terms.length - 1];
      if (!latestTerm) return;
      const tenantName = c.tenantIds.map(id => stakeholders.find(s => s.id === id)?.name).filter(Boolean).join(', ') || '미지정';
      if (latestTerm.endDate)   all.push({ id: `le_${c.id}`, date: latestTerm.endDate,   title: `임대 종료: ${tenantName}`, category: 'LEASE_END' });
      if (latestTerm.startDate) all.push({ id: `ls_${c.id}`, date: latestTerm.startDate, title: `임대 시작: ${tenantName}`, category: latestTerm.type === 'RENEWAL' ? 'LEASE_RENEWAL' : 'LEASE_START' });
    });
    transactions.filter(t => t.status === 'UNPAID' || t.status === 'OVERDUE').forEach(t => {
      if (t.dueDate) all.push({ id: `pt_${t.id}`, date: t.dueDate, title: `납입 기한 (${t.type === 'RENT' ? '월차임' : t.type === 'ADMIN_FEE' ? '관리비' : '기타'})`, category: 'PAYMENT_DUE', detail: t.status === 'OVERDUE' ? '연체' : '' });
    });
    facilities.forEach(f => {
      if (f.nextInspectionDate) all.push({ id: `fi_${f.id}`, date: f.nextInspectionDate, title: `점검: ${f.name}`, category: 'FACILITY_INSP' });
    });
    maintenanceContracts.filter(m => m.status === 'ACTIVE').forEach(m => {
      if (m.term.endDate) {
        const vendor = stakeholders.find(s => s.id === m.vendorId)?.name || '미지정';
        all.push({ id: `me_${m.id}`, date: m.term.endDate, title: `용역 만료: ${vendor}`, category: 'MAINT_END' });
      }
    });
    utilityContracts.filter(u => u.status === 'ACTIVE').forEach(u => {
      for (let m = month - 1; m <= month + 1; m++) {
        const d = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0).getDate();
        const day = Math.min(u.paymentDay, lastDay);
        const dateStr = toDateStr(d.getFullYear(), d.getMonth(), day);
        all.push({ id: `up_${u.id}_${dateStr}`, date: dateStr, title: `공과금: ${u.provider}`, category: 'UTIL_PAYMENT', detail: u.category });
      }
    });
    return all;
  }, [contracts, transactions, facilities, maintenanceContracts, utilityContracts, stakeholders, year, month]);

  const filteredEvents = events.filter(e => activeFilters.has(e.category));
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
    return map;
  }, [filteredEvents]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  // 콜론 이후 텍스트만 추출 (길이 제한 없이 CSS truncate에 맡김)
  const shortTitle = (t: string) =>
    t.includes(':') ? t.split(':').slice(1).join(':').trim() : t;

  return (
    <div className="flex flex-col gap-2 h-full overflow-auto">
      {/* 필터 칩 */}
      <div className="flex flex-wrap gap-1 flex-shrink-0">
        <button onClick={() => setActiveFilters(new Set(ALL_CATEGORIES))}
          className="text-[8px] font-black px-1.5 py-0.5 rounded-full border border-gray-300 text-[#5f6368] hover:bg-gray-100">전체</button>
        {ALL_CATEGORIES.map(cat => {
          const m = EVENT_META[cat];
          const on = activeFilters.has(cat);
          return (
            <button key={cat} onClick={() => toggleFilter(cat)}
              className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 transition-all ${on ? m.color : 'bg-white border-gray-200 text-gray-400 line-through'}`}>
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: on ? m.dot : '#d1d5db' }}/>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-[#5f6368]"><ChevronLeft size={15}/></button>
        <span className="font-black text-sm text-[#202124]">{year}년 {month + 1}월</span>
        <div className="flex items-center gap-1">
          <button onClick={() => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(todayStr); }}
            className="text-[9px] font-black px-2 py-0.5 rounded border border-[#dadce0] text-[#1a73e8] hover:bg-[#e8f0fe]">오늘</button>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-[#5f6368]"><ChevronRight size={15}/></button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 flex-shrink-0">
        {DOW.map((d, i) => (
          <div key={d} className={`text-center text-[9px] font-black py-0.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#5f6368]'}`}>{d}</div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-px bg-[#dadce0] rounded-lg overflow-hidden border border-[#dadce0] flex-shrink-0">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} className="bg-[#f8f9fa] min-h-[60px] md:min-h-[76px]"/>)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dateStr = toDateStr(year, month, day);
          const dayEvents = eventsByDay[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDay;
          const isPast = dateStr < todayStr;
          const dow = (firstDow + day - 1) % 7;
          return (
            <div key={day} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              className={`bg-white p-0.5 cursor-pointer transition-all hover:bg-[#f8f9fa] min-h-[60px] md:min-h-[76px] flex flex-col ${isSelected ? 'ring-1 ring-inset ring-[#1a73e8] bg-[#e8f0fe]' : ''} ${isPast ? 'opacity-60' : ''}`}>
              <div className={`text-[9px] md:text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full mb-px flex-shrink-0 ${isToday ? 'bg-[#1a73e8] text-white' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-[#202124]'}`}>
                {day}
              </div>
              <div className="flex flex-col gap-px flex-1 min-h-0 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className={`text-[9px] leading-tight px-0.5 rounded truncate border ${EVENT_META[ev.category].color}`}>
                    {shortTitle(ev.title)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[8px] text-gray-400 font-bold leading-tight">+{dayEvents.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 세부 테이블 (날짜 선택 시) */}
      {selectedDay && (
        <div className="flex-shrink-0 border-t-2 border-[#1a73e8] pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-black text-[#202124] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] flex-shrink-0"/>
              {selectedDay} 상세 일정
            </h4>
            <button onClick={() => setSelectedDay(null)} className="text-[#9aa0a6] hover:text-red-500 p-0.5 rounded transition-colors">
              <X size={12}/>
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">이 날의 일정이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px]">
                <thead className="bg-[#f8f9fa] border-y border-[#dadce0]">
                  <tr className="text-[8px] font-black text-[#5f6368] uppercase tracking-wide">
                    <th className="p-1.5 text-left whitespace-nowrap">구분</th>
                    <th className="p-1.5 text-left">내용</th>
                    <th className="p-1.5 text-left whitespace-nowrap hidden md:table-cell">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEvents.map(ev => {
                    const m = EVENT_META[ev.category];
                    return (
                      <tr key={ev.id} className="border-b border-[#f1f3f4] last:border-0 hover:bg-[#f8f9fa]">
                        <td className="p-1.5 whitespace-nowrap">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${m.color}`}>{m.label}</span>
                        </td>
                        <td className="p-1.5 text-[10px] text-[#202124] font-medium">{ev.title}</td>
                        <td className="p-1.5 text-[9px] text-[#5f6368] hidden md:table-cell">{ev.detail || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// 위젯 정의
// ──────────────────────────────────────────────
interface WidgetDef {
  id: string;
  title: string;
  category: WidgetCategory;
  defaultCols: 1 | 2 | 4;
  defaultHeight: number; // 픽셀
  render: (props: DashboardProps) => React.ReactNode;
}

// col-span 클래스 맵 (Tailwind CDN 스캔용 전체 문자열)
const COL_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  4: 'col-span-1 md:col-span-2 xl:col-span-4',
};

const WIDGETS: WidgetDef[] = [
  // 1. FINANCIAL
  {
    id: 'financial_summary',
    title: '재무 현황 요약',
    category: 'FINANCE',
    defaultCols: 4, defaultHeight: 180,
    render: ({ financials, formatMoney }) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 h-full">
        <StatsCard title="총 수입 (청구)" value={formatMoney(financials.totalRevenue)} icon={<ArrowDownLeft size={20}/>} subValue="전체 수입 (VAT 포함)"/>
        <StatsCard title="수납율" value={`${Math.round(financials.collectionRate)}%`} icon={<Wallet size={20}/>} subValue={`수납: ${formatMoney(financials.collectedAmount)}`} trend={financials.collectionRate < 90 ? '주의 필요' : '양호'} trendUp={financials.collectionRate >= 90}/>
        <StatsCard title="순수익 (Net)" value={formatMoney(financials.netIncome)} icon={<TrendingUp size={20}/>} subValue={`지출: ${formatMoney(financials.totalExpense)}`}/>
        <StatsCard title="미수금 현황" value={formatMoney(financials.overdueAmount)} icon={<AlertTriangle size={20}/>} trend="관리 필요" trendUp={false}/>
      </div>
    ),
  },
  {
    id: 'monthly_revenue_chart',
    title: '월별 수지 분석 (최근 6개월)',
    category: 'FINANCE',
    defaultCols: 2, defaultHeight: 320,
    render: ({ financials, formatMoney }) => {
      const data = financials.monthlyHistory.slice(-6);
      if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-[10px] md:text-sm">표시할 재무 데이터가 없습니다.</div>;
      return (
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={35} tickFormatter={(v) => v >= 1000000 ? (v / 1000000).toFixed(0) + 'M' : (v / 1000).toFixed(0) + 'K'}/>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
              <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}/>
              <Area type="monotone" dataKey="income" stroke="#6366f1" fillOpacity={1} fill="url(#colorIncome)" name="수입"/>
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" name="지출"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    },
  },

  // 2. ASSET
  {
    id: 'asset_summary',
    title: '자산 포트폴리오 요약',
    category: 'ASSET',
    defaultCols: 1, defaultHeight: 280,
    render: ({ properties, units }) => (
      <div className="flex flex-col h-full justify-center gap-3">
        <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Building2 size={18}/></div>
            <div>
              <p className="text-[8px] md:text-xs text-gray-500 font-bold uppercase whitespace-nowrap">총 관리 사업지</p>
              <p className="text-base md:text-xl font-bold text-gray-900">{properties.length} <span className="text-xs font-normal text-gray-500">개소</span></p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Layers size={18}/></div>
            <div>
              <p className="text-[8px] md:text-xs text-gray-500 font-bold uppercase whitespace-nowrap">총 임대 호실</p>
              <p className="text-base md:text-xl font-bold text-gray-900">{units.length} <span className="text-xs font-normal text-gray-500">세대</span></p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'valuation_trend',
    title: '자산 가치 변동 추이',
    category: 'ASSET',
    defaultCols: 2, defaultHeight: 320,
    render: ({ valuations, formatMoney }) => {
      const dataMap: Record<number, number> = {};
      valuations.forEach(v => { dataMap[v.year] = (dataMap[v.year] || 0) + (v.marketValue || v.officialValue); });
      const data = Object.keys(dataMap).map(year => ({ year, value: dataMap[Number(year)] }));
      if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-[10px] md:text-sm">자산 평가 데이터가 없습니다.</div>;
      return (
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
              <XAxis dataKey="year" axisLine={false} tickLine={false}/>
              <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => (v / 100000000).toFixed(0) + '억'} width={40}/>
              <Tooltip formatter={(value: number) => formatMoney(value)}/>
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="추정 가치 합계"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    },
  },

  // 3. OPERATION
  {
    id: 'occupancy_rate',
    title: '임대 현황 (공실률)',
    category: 'OPERATION',
    defaultCols: 1, defaultHeight: 320,
    render: ({ units }) => {
      const occupied = units.filter(u => u.status === 'OCCUPIED').length;
      const vacant = units.filter(u => u.status === 'VACANT').length;
      const repair = units.filter(u => u.status === 'UNDER_REPAIR').length;
      const total = units.length;
      if (total === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-[10px] md:text-sm">등록된 호실 없음</div>;
      const data = [
        { name: '임대중', value: occupied, color: '#6366f1' },
        { name: '공실',   value: vacant,   color: '#e5e7eb' },
        { name: '보수중', value: repair,   color: '#f59e0b' },
      ];
      return (
        <div className="h-full w-full flex flex-col">
          <div className="relative flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius="30%" outerRadius="48%" paddingAngle={5} dataKey="value">
                  {data.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-gray-800">{Math.round((occupied / total) * 100)}%</p>
                <p className="text-[8px] md:text-xs text-gray-500">임대율</p>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 flex justify-center gap-4 py-2 flex-wrap">
            {data.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }}/>
                <span className="text-[9px] md:text-xs text-gray-600 font-medium">{d.name} {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: 'expiring_contracts',
    title: '계약 만료 예정 (60일 내)',
    category: 'OPERATION',
    defaultCols: 2, defaultHeight: 320,
    render: ({ contracts, formatMoney, stakeholders }) => {
      const expiring = contracts.filter(c => {
        if (c.status !== 'ACTIVE') return false;
        const latestTerm = c.terms[c.terms.length - 1];
        if (!latestTerm) return false;
        const diff = Math.ceil((new Date(latestTerm.endDate).getTime() - Date.now()) / 86400000);
        return diff >= 0 && diff <= 60;
      }).sort((a, b) => {
        const aE = a.terms[a.terms.length - 1]?.endDate || '';
        const bE = b.terms[b.terms.length - 1]?.endDate || '';
        return new Date(aE).getTime() - new Date(bE).getTime();
      });
      if (expiring.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-[10px] md:text-sm">
          <CheckCircle size={24} className="mb-2 text-green-500 opacity-50"/>만료 예정인 계약이 없습니다.
        </div>
      );
      return (
        <div className="overflow-x-auto h-full">
          <table className="w-full text-xs md:text-sm text-left whitespace-nowrap min-w-[400px]">
            <thead className="bg-gray-50 text-[8px] md:text-[11px] font-black text-gray-600 uppercase tracking-wide border-b border-gray-100 sticky top-0">
              <tr>
                <th className="p-2 md:p-3">만료일</th>
                <th className="p-2 md:p-3">임차인</th>
                <th className="p-2 md:p-3 text-right">보증금</th>
                <th className="p-2 md:p-3 text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map(c => {
                const tenant = stakeholders.find(s => c.tenantIds.includes(s.id))?.name || '미상';
                const lt = c.terms[c.terms.length - 1];
                const endDate = lt?.endDate || '';
                const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="p-2 md:p-3 text-gray-800 font-medium text-[10px] md:text-sm">
                      {endDate} <span className="text-[8px] md:text-xs text-red-500 font-bold ml-1">({daysLeft}일)</span>
                    </td>
                    <td className="p-2 md:p-3 text-gray-600 text-[10px] md:text-sm truncate max-w-[60px] md:max-w-none">{tenant}</td>
                    <td className="p-2 md:p-3 text-right text-gray-600 text-[10px] md:text-sm tracking-tight">{lt ? formatMoney(lt.deposit) : '-'}</td>
                    <td className="p-2 md:p-3 text-center"><span className="px-1.5 md:px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[8px] md:text-xs whitespace-nowrap font-bold">만료임박</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    },
  },

  // 4. FACILITY
  {
    id: 'facility_health',
    title: '설비 안전 등급',
    category: 'FACILITY',
    defaultCols: 1, defaultHeight: 280,
    render: ({ facilities }) => {
      const normal  = facilities.filter(f => f.status === 'OPERATIONAL').length;
      const warning = facilities.filter(f => f.status === 'INSPECTION_DUE').length;
      const danger  = facilities.filter(f => f.status === 'MALFUNCTION' || f.status === 'UNDER_REPAIR').length;
      const total = facilities.length;
      if (total === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-[10px] md:text-sm">등록된 설비가 없습니다.</div>;
      return (
        <div className="flex flex-col gap-4 h-full justify-center px-1 md:px-2">
          {[
            { label: '정상 가동', count: normal,  color: 'bg-green-500',  icon: <CheckCircle size={12} className="text-green-500"/> },
            { label: '점검 요망', count: warning, color: 'bg-orange-500', icon: <AlertCircle size={12} className="text-orange-500"/> },
            { label: '고장/수리', count: danger,  color: 'bg-red-500',    icon: <AlertTriangle size={12} className="text-red-500"/> },
          ].map(row => (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-[10px] md:text-sm text-gray-600 font-medium whitespace-nowrap">{row.icon} {row.label}</span>
                <span className="font-bold text-gray-900 text-xs md:text-base">{row.count}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 md:h-2.5 rounded-full overflow-hidden">
                <div className={`${row.color} h-full rounded-full`} style={{ width: `${(row.count / total) * 100}%` }}/>
              </div>
            </div>
          ))}
        </div>
      );
    },
  },

  // 5. SCHEDULE
  {
    id: 'event_calendar',
    title: '주요 이슈 캘린더',
    category: 'SCHEDULE',
    defaultCols: 4, defaultHeight: 520,
    render: (props) => <EventCalendarWidget {...props}/>,
  },
];

// ──────────────────────────────────────────────
// 위젯 설정 타입 (height: 픽셀, cols: 1|2|4)
// ──────────────────────────────────────────────
type WCfg = { cols: 1 | 2 | 4; height: number };

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>([
    'financial_summary', 'monthly_revenue_chart', 'asset_summary', 'occupancy_rate', 'expiring_contracts', 'facility_health', 'event_calendar',
  ]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgetConfigs, setWidgetConfigs] = useState<Record<string, WCfg>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // 그리드 컨테이너 ref (열 폭 계산용)
  const gridRef = useRef<HTMLDivElement>(null);
  // 리사이즈 드래그 상태
  const resizeRef = useRef<{ id: string; startX: number; startY: number; startH: number; startCols: 1 | 2 | 4; sameRowIds: string[] } | null>(null);

  const getWCfg = (w: WidgetDef): WCfg =>
    widgetConfigs[w.id] ?? { cols: w.defaultCols, height: w.defaultHeight };

  const updateWCfg = (id: string, patch: Partial<WCfg>) => {
    const w = WIDGETS.find(x => x.id === id)!;
    setWidgetConfigs(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? { cols: w.defaultCols, height: w.defaultHeight }), ...patch },
    }));
  };

  // ── 위젯 리사이즈 드래그 ──────────────────────
  const handleResizeStart = (e: React.MouseEvent, id: string, cfg: WCfg) => {
    e.preventDefault();
    e.stopPropagation();

    // 시작 시점의 같은 행 위젯 목록 캡처 (클로저)
    const myRow = widgetRowNums[id];
    const sameRowIds = activeWidgets.filter(w => widgetRowNums[w.id] === myRow).map(w => w.id);
    resizeRef.current = { id, startX: e.clientX, startY: e.clientY, startH: cfg.height, startCols: cfg.cols, sameRowIds };

    const onMouseMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      const { id, startX, startY, startH, startCols, sameRowIds } = resizeRef.current;

      // 높이: Y축 드래그, 기본값의 50% 이상 유지
      const widgetDef = WIDGETS.find(x => x.id === id)!;
      const minH = Math.round(widgetDef.defaultHeight * 0.5);
      const newH = Math.max(minH, startH + (me.clientY - startY));

      // 너비: X축 드래그로 컬럼 스냅, 기본 cols의 50% 미만으로 줄이지 않음
      const gw = gridRef.current?.offsetWidth ?? 800;
      const unitW = gw / 4;
      const dX = me.clientX - startX;
      const rawUnits = startCols + dX / unitW;
      const rawCols: 1 | 2 | 4 = rawUnits >= 3 ? 4 : rawUnits >= 1.5 ? 2 : 1;
      const minCols = (widgetDef.defaultCols >= 4 ? 2 : 1) as 1 | 2 | 4;
      const newCols = Math.max(minCols, rawCols) as 1 | 2 | 4;

      // 같은 행의 모든 위젯에 height 동기화, 너비는 드래그 위젯만
      setWidgetConfigs(prev => {
        const next = { ...prev };
        sameRowIds.forEach(wid => {
          const w = WIDGETS.find(x => x.id === wid)!;
          next[wid] = { ...(prev[wid] ?? { cols: w.defaultCols, height: w.defaultHeight }), height: newH };
        });
        const w = WIDGETS.find(x => x.id === id)!;
        next[id] = { ...(next[id] ?? { cols: w.defaultCols, height: w.defaultHeight }), cols: newCols };
        return next;
      });
    };

    const onMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ── 위젯 순서 드래그 ──────────────────────────
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const arr = [...activeWidgetIds];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(dragIdx < idx ? idx - 1 : idx, 0, moved);
    setActiveWidgetIds(arr);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const toggleWidget = (id: string) => {
    setActiveWidgetIds(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  const activeWidgets = activeWidgetIds
    .map(id => WIDGETS.find(w => w.id === id))
    .filter(Boolean) as WidgetDef[];

  // 각 위젯의 행 번호 계산 (xl:grid-cols-4 기준)
  const widgetRowNums = useMemo(() => {
    const TOTAL = 4;
    const nums: Record<string, number> = {};
    let row = 0, filled = 0;
    for (const w of activeWidgets) {
      const cols = getWCfg(w).cols;
      if (filled > 0 && filled + cols > TOTAL) { row++; filled = 0; }
      nums[w.id] = row;
      filled += cols;
      if (filled >= TOTAL) { row++; filled = 0; }
    }
    return nums;
  }, [activeWidgets, widgetConfigs]);

  return (
    <div className="space-y-4 pb-10">
      {/* 헤더 */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${isEditMode ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}
        >
          {isEditMode ? <CheckCircle size={14}/> : <Settings size={14}/>}
          {isEditMode ? '설정 완료' : '위젯 설정'}
        </button>
      </div>

      {/* 위젯 라이브러리 패널 */}
      {isEditMode && (
        <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-indigo-200 shadow-lg ring-1 ring-indigo-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100 text-sm md:text-base">
            <Layers size={16} className="text-indigo-600"/> 위젯 라이브러리
            <span className="ml-auto text-[10px] text-gray-400 font-normal">제목 드래그=위치 변경 · 하단 바 드래그=크기 변경</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
            {(['FINANCE', 'ASSET', 'OPERATION', 'FACILITY', 'SCHEDULE'] as WidgetCategory[]).map(category => (
              <div key={category}>
                <h4 className="text-[8px] md:text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"/>
                  {category}
                </h4>
                <div className="space-y-1.5">
                  {WIDGETS.filter(w => w.category === category).map(w => (
                    <label key={w.id} className={`flex items-center gap-2 p-2 md:p-3 rounded-lg border cursor-pointer transition-all ${activeWidgetIds.includes(w.id) ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={activeWidgetIds.includes(w.id)} onChange={() => toggleWidget(w.id)}
                        className="w-3 md:w-4 h-3 md:h-4 text-indigo-600 rounded"/>
                      <span className={`text-[9px] md:text-sm font-medium leading-tight ${activeWidgetIds.includes(w.id) ? 'text-indigo-900' : 'text-gray-600'}`}>{w.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 대시보드 그리드 */}
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {activeWidgets.map((widget, idx) => {
          const cfg = getWCfg(widget);
          const isDragging = dragIdx === idx;
          const isOver = dragOverIdx === idx && dragIdx !== idx;

          // 열 인디케이터 (1/2/4 칸 시각화)
          const colDots = [1, 2, 3, 4].map(i => {
            const filled = cfg.cols === 4 ? true : cfg.cols === 2 ? i <= 2 : i === 1;
            return filled;
          });

          return (
            <div
              key={widget.id}
              draggable={isEditMode}
              onDragStart={isEditMode ? (e) => handleDragStart(e, idx) : undefined}
              onDragOver={isEditMode ? (e) => handleDragOver(e, idx) : undefined}
              onDrop={isEditMode ? (e) => handleDrop(e, idx) : undefined}
              onDragEnd={isEditMode ? handleDragEnd : undefined}
              className={`bg-white rounded-xl md:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border flex flex-col transition-all duration-200 ${COL_CLASS[cfg.cols]} ${isOver ? 'border-[#1a73e8] ring-2 ring-blue-200' : 'border-gray-200'} ${isDragging ? 'opacity-30 scale-[0.97]' : ''}`}
            >
              {/* 헤더 */}
              <div className={`px-3 md:px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl md:rounded-t-2xl gap-2 flex-shrink-0 ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <h3 className="font-bold text-gray-800 text-[10px] md:text-sm flex items-center gap-1 min-w-0">
                  {isEditMode && <GripVertical size={13} className="text-[#c4c7cc] flex-shrink-0"/>}
                  <span className="truncate">{widget.title}</span>
                </h3>
                {isEditMode && (
                  <button onClick={() => toggleWidget(widget.id)}
                    className="flex-shrink-0 text-[#9aa0a6] hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-colors">
                    <X size={12}/>
                  </button>
                )}
              </div>

              {/* 콘텐츠 (높이 고정 → 내용이 채움) */}
              <div className="overflow-hidden flex-none" style={{ height: cfg.height }}>
                <div className="p-3 md:p-4 h-full overflow-auto">
                  {widget.render(props)}
                </div>
              </div>

              {/* 리사이즈 바 (편집 모드만 표시) */}
              {isEditMode && (
                <div
                  onMouseDown={(e) => handleResizeStart(e, widget.id, cfg)}
                  className="flex-shrink-0 h-6 flex items-center justify-between px-2.5 bg-[#f8f9fa] border-t border-[#efefef] rounded-b-xl md:rounded-b-2xl cursor-ns-resize select-none group"
                  title="위아래로 드래그하면 높이 변경, 좌우로 드래그하면 너비(열 수) 변경"
                >
                  {/* 열 너비 인디케이터 */}
                  <div className="flex gap-0.5 items-center">
                    {colDots.map((filled, i) => (
                      <div key={i} className={`w-3 h-[5px] rounded-sm transition-colors ${filled ? 'bg-[#1a73e8]' : 'bg-[#e8eaed]'}`}/>
                    ))}
                  </div>
                  {/* 드래그 핸들 점선 */}
                  <div className="flex gap-0.5 opacity-40 group-hover:opacity-80 transition-opacity">
                    {[...Array(5)].map((_, i) => <div key={i} className="w-3 h-0.5 bg-[#5f6368] rounded-full"/>)}
                  </div>
                  {/* 현재 높이 */}
                  <span className="text-[9px] text-[#9aa0a6] font-mono tracking-tight">{cfg.height}px</span>
                </div>
              )}
            </div>
          );
        })}

        {activeWidgets.length === 0 && (
          <div className="col-span-1 md:col-span-2 xl:col-span-4 py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <Settings size={32} className="mx-auto mb-4 opacity-20"/>
            <p className="font-medium text-xs md:text-base">선택된 위젯이 없습니다.</p>
            <p className="text-[10px] md:text-sm mt-1">'위젯 설정' 버튼을 눌러 홈 화면을 꾸며보세요.</p>
          </div>
        )}

        {/* 맨 뒤 드롭 존 (편집 모드 + 드래그 중일 때만) */}
        {isEditMode && dragIdx !== null && (
          <div
            onDragOver={(e) => handleDragOver(e, activeWidgets.length)}
            onDrop={(e) => handleDrop(e, activeWidgets.length)}
            className={`col-span-1 md:col-span-2 xl:col-span-4 h-12 rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${
              dragOverIdx === activeWidgets.length
                ? 'border-[#1a73e8] bg-[#e8f0fe]'
                : 'border-[#dadce0] opacity-50'
            }`}
          >
            <span className={`text-[9px] font-bold ${dragOverIdx === activeWidgets.length ? 'text-[#1a73e8]' : 'text-[#9aa0a6]'}`}>
              맨 뒤로 이동
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
