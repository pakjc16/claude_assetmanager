
import React, { useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { StatsCard } from './StatsCard';
import { Building2, Wallet, AlertTriangle, Settings, X, Layers, TrendingUp, CheckCircle, AlertCircle, ArrowDownLeft } from 'lucide-react';
import { DashboardFinancials, LeaseContract, Property, Unit, ValuationHistory, Facility, PaymentTransaction, Stakeholder } from '../types';

interface DashboardProps {
  financials: DashboardFinancials;
  properties: Property[];
  contracts: LeaseContract[];
  units: Unit[];
  valuations: ValuationHistory[];
  facilities: Facility[];
  transactions: PaymentTransaction[];
  stakeholders: Stakeholder[];
  formatMoney: (amount: number) => string;
}

type WidgetCategory = 'FINANCE' | 'ASSET' | 'OPERATION' | 'FACILITY';

interface WidgetDef {
  id: string;
  title: string;
  category: WidgetCategory;
  // Responsive col-span classes for Tailwind
  className: string; 
  render: (props: DashboardProps) => React.ReactNode;
}

// --- WIDGET DEFINITIONS ---
const WIDGETS: WidgetDef[] = [
  // 1. FINANCIAL WIDGETS
  {
    id: 'financial_summary',
    title: '재무 현황 요약',
    category: 'FINANCE',
    className: 'col-span-1 md:col-span-2 xl:col-span-4', // Full width on large screens
    render: ({ financials, formatMoney }) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
        <StatsCard
          title="총 수입 (청구)"
          value={formatMoney(financials.totalRevenue)}
          icon={<ArrowDownLeft size={20} />}
          subValue="전체 수입 (VAT 포함)"
        />
        <StatsCard
          title="수납율"
          value={`${Math.round(financials.collectionRate)}%`}
          icon={<Wallet size={20} />}
          subValue={`수납: ${formatMoney(financials.collectedAmount)}`}
          trend={financials.collectionRate < 90 ? '주의 필요' : '양호'}
          trendUp={financials.collectionRate >= 90}
        />
        <StatsCard
          title="순수익 (Net)"
          value={formatMoney(financials.netIncome)} 
          icon={<TrendingUp size={20} />}
          subValue={`지출: ${formatMoney(financials.totalExpense)}`}
        />
         <StatsCard
          title="미수금 현황"
          value={formatMoney(financials.overdueAmount)}
          icon={<AlertTriangle size={20} />}
          trend="관리 필요"
          trendUp={false}
        />
      </div>
    )
  },
  {
    id: 'monthly_revenue_chart',
    title: '월별 수지 분석 (최근 6개월)',
    category: 'FINANCE',
    className: 'col-span-1 md:col-span-2 xl:col-span-2',
    render: ({ financials, formatMoney }) => {
      const data = financials.monthlyHistory.slice(-6);
      
      if(data.length === 0) return <div className="h-[200px] md:h-[300px] flex items-center justify-center text-gray-400 text-[10px] md:text-sm">표시할 재무 데이터가 없습니다.</div>

      return (
        <div className="h-[200px] md:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} width={35} tickFormatter={(val) => val >= 1000000 ? (val/1000000).toFixed(0)+'M' : (val/1000).toFixed(0)+'K'}/>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
              <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
              <Area type="monotone" dataKey="income" stroke="#6366f1" fillOpacity={1} fill="url(#colorIncome)" name="수입" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" name="지출" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }
  },

  // 2. ASSET WIDGETS
  {
    id: 'asset_summary',
    title: '자산 포트폴리오 요약',
    category: 'ASSET',
    className: 'col-span-1 md:col-span-1 xl:col-span-1',
    render: ({ properties, units }) => (
      <div className="flex flex-col h-full justify-center space-y-3 md:space-y-4 min-h-[150px] md:min-h-[200px]">
        <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
           <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-indigo-100 p-2 md:p-2.5 rounded-lg text-indigo-600"><Building2 size={18} className="md:w-6 md:h-6"/></div>
              <div>
                <p className="text-[8px] md:text-xs text-gray-500 font-bold uppercase whitespace-nowrap">총 관리 사업지</p>
                <p className="text-base md:text-xl font-bold text-gray-900">{properties.length} <span className="text-xs md:text-sm font-normal text-gray-500">개소</span></p>
              </div>
           </div>
        </div>
        <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
           <div className="flex items-center gap-2 md:gap-3">
              <div className="bg-purple-100 p-2 md:p-2.5 rounded-lg text-purple-600"><Layers size={18} className="md:w-6 md:h-6"/></div>
              <div>
                <p className="text-[8px] md:text-xs text-gray-500 font-bold uppercase whitespace-nowrap">총 임대 호실</p>
                <p className="text-base md:text-xl font-bold text-gray-900">{units.length} <span className="text-xs md:text-sm font-normal text-gray-500">세대</span></p>
              </div>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'valuation_trend',
    title: '자산 가치 변동 추이',
    category: 'ASSET',
    className: 'col-span-1 md:col-span-2 xl:col-span-2',
    render: ({ valuations, formatMoney }) => {
        const dataMap: Record<number, number> = {};
        valuations.forEach(v => {
            dataMap[v.year] = (dataMap[v.year] || 0) + (v.marketValue || v.officialValue);
        });
        const data = Object.keys(dataMap).map(year => ({ year, value: dataMap[Number(year)] }));
        if(data.length === 0) return <div className="h-[200px] md:h-[300px] flex items-center justify-center text-gray-400 text-[10px] md:text-sm">자산 평가 데이터가 없습니다.</div>

        return (
          <div className="h-[200px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => (val/100000000).toFixed(0)+'억'} width={40}/>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="추정 가치 합계"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
    }
  },

  // 3. OPERATION WIDGETS
  {
    id: 'occupancy_rate',
    title: '임대 현황 (공실률)',
    category: 'OPERATION',
    className: 'col-span-1 md:col-span-1 xl:col-span-1',
    render: ({ units }) => {
      const occupied = units.filter(u => u.status === 'OCCUPIED').length;
      const vacant = units.filter(u => u.status === 'VACANT').length;
      const repair = units.filter(u => u.status === 'UNDER_REPAIR').length;
      
      const total = units.length;
      if (total === 0) return <div className="h-[150px] md:h-[200px] flex items-center justify-center text-gray-400 text-[10px] md:text-sm">등록된 호실 없음</div>;

      const data = [
        { name: '임대중', value: occupied, color: '#6366f1' },
        { name: '공실', value: vacant, color: '#e5e7eb' },
        { name: '보수중', value: repair, color: '#f59e0b' }
      ];
      
      return (
        <div className="h-[200px] md:h-[300px] w-full relative">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie
                 data={data}
                 cx="50%"
                 cy="50%"
                 innerRadius={60}
                 outerRadius={80}
                 paddingAngle={5}
                 dataKey="value"
               >
                 {data.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={entry.color} />
                 ))}
               </Pie>
               <Legend verticalAlign="bottom" height={36} iconSize={10}/>
               <Tooltip />
             </PieChart>
           </ResponsiveContainer>
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-6 md:pb-8">
              <div className="text-center">
                 <p className="text-xl md:text-3xl font-bold text-gray-800">{Math.round((occupied / total) * 100)}%</p>
                 <p className="text-[8px] md:text-xs text-gray-500">임대율</p>
              </div>
           </div>
        </div>
      );
    }
  },
  {
    id: 'expiring_contracts',
    title: '계약 만료 예정 (60일 내)',
    category: 'OPERATION',
    className: 'col-span-1 md:col-span-2 xl:col-span-2',
    render: ({ contracts, formatMoney, stakeholders }) => {
      const expiring = contracts.filter(c => {
        if (c.status !== 'ACTIVE') return false;
        const latestTerm = c.terms[c.terms.length - 1];
        if (!latestTerm) return false;
        const end = new Date(latestTerm.endDate);
        const today = new Date();
        const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 60;
      }).sort((a,b) => {
        const aEnd = a.terms[a.terms.length - 1]?.endDate || '';
        const bEnd = b.terms[b.terms.length - 1]?.endDate || '';
        return new Date(aEnd).getTime() - new Date(bEnd).getTime();
      });

      if (expiring.length === 0) return <div className="h-[150px] md:h-[200px] flex flex-col items-center justify-center text-gray-400 text-[10px] md:text-sm"><CheckCircle size={24} className="md:w-8 md:h-8 mb-2 text-green-500 opacity-50"/>만료 예정인 계약이 없습니다.</div>

      return (
        <div className="overflow-x-auto h-[200px] md:h-[300px]">
          <table className="w-full text-xs md:text-sm text-left whitespace-nowrap min-w-[400px]">
            <thead className="bg-gray-50 text-[8px] md:text-[11px] font-black text-gray-600 uppercase tracking-wide md:tracking-widest border-b border-gray-100 sticky top-0">
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
                const latestTerm = c.terms[c.terms.length - 1];
                const endDate = latestTerm?.endDate || '';
                const daysLeft = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="p-2 md:p-3 text-gray-800 font-medium text-[10px] md:text-sm">
                      {endDate} <span className="text-[8px] md:text-xs text-red-500 font-bold ml-1">({daysLeft}일)</span>
                    </td>
                    <td className="p-2 md:p-3 text-gray-600 text-[10px] md:text-sm truncate max-w-[60px] md:max-w-none">{tenant}</td>
                    <td className="p-2 md:p-3 text-right text-gray-600 text-[10px] md:text-sm tracking-tight">{latestTerm ? formatMoney(latestTerm.deposit) : '-'}</td>
                    <td className="p-2 md:p-3 text-center"><span className="px-1.5 md:px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[8px] md:text-xs whitespace-nowrap font-bold">만료임박</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  },

  // 4. FACILITY WIDGETS
  {
    id: 'facility_health',
    title: '설비 안전 등급',
    category: 'FACILITY',
    className: 'col-span-1 md:col-span-1 xl:col-span-1',
    render: ({ facilities }) => {
       const normal = facilities.filter(f => f.status === 'OPERATIONAL').length;
       const warning = facilities.filter(f => f.status === 'INSPECTION_DUE').length;
       const danger = facilities.filter(f => f.status === 'MALFUNCTION' || f.status === 'UNDER_REPAIR').length;
       const total = facilities.length;
       
       if (total === 0) return <div className="h-[150px] md:h-[200px] flex items-center justify-center text-gray-400 text-[10px] md:text-sm">등록된 설비가 없습니다.</div>

       return (
         <div className="flex flex-col gap-3 md:gap-5 h-full justify-center py-2 md:py-4 px-1 md:px-2 min-h-[180px] md:min-h-[250px]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-gray-600 font-medium whitespace-nowrap"><CheckCircle size={12} className="md:w-4 md:h-4 text-green-500"/> 정상 가동</span>
                <span className="font-bold text-gray-900 text-xs md:text-base">{normal}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 md:h-2.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full rounded-full" style={{width: `${(normal/total)*100}%`}}></div></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-gray-600 font-medium whitespace-nowrap"><AlertCircle size={12} className="md:w-4 md:h-4 text-orange-500"/> 점검 요망</span>
                <span className="font-bold text-gray-900 text-xs md:text-base">{warning}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 md:h-2.5 rounded-full overflow-hidden"><div className="bg-orange-500 h-full rounded-full" style={{width: `${(warning/total)*100}%`}}></div></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-gray-600 font-medium whitespace-nowrap"><AlertTriangle size={12} className="md:w-4 md:h-4 text-red-500"/> 고장/수리</span>
                <span className="font-bold text-gray-900 text-xs md:text-base">{danger}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 md:h-2.5 rounded-full overflow-hidden"><div className="bg-red-500 h-full rounded-full" style={{width: `${(danger/total)*100}%`}}></div></div>
            </div>
         </div>
       );
    }
  }
];

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>([
    'financial_summary', 'monthly_revenue_chart', 'asset_summary', 'occupancy_rate', 'expiring_contracts', 'facility_health'
  ]);
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleWidget = (id: string) => {
    setActiveWidgetIds(prev => 
      prev.includes(id) ? prev.filter(wid => wid !== id) : [...prev, id]
    );
  };

  const activeWidgets = activeWidgetIds
    .map(id => WIDGETS.find(w => w.id === id))
    .filter(w => w !== undefined) as WidgetDef[];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 md:p-5 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm gap-3 md:gap-4">
         <div>
            <h2 className="text-base md:text-xl font-bold text-gray-900">통합 자산 운용 리포트</h2>
            <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">실시간 자산 현황 및 주요 경영 지표 모니터링</p>
         </div>
         <button
           onClick={() => setIsEditMode(!isEditMode)}
           className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${isEditMode ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600'}`}
         >
            {isEditMode ? <CheckCircle size={14} className="md:w-[18px] md:h-[18px]"/> : <Settings size={14} className="md:w-[18px] md:h-[18px]"/>}
            {isEditMode ? '설정 완료' : '위젯 설정'}
         </button>
      </div>

      {/* Edit Mode Panel */}
      {isEditMode && (
         <div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-indigo-200 shadow-lg animate-in slide-in-from-top-2 ring-1 ring-indigo-100">
            <h3 className="font-bold text-gray-800 mb-4 md:mb-6 flex items-center gap-2 pb-2 border-b border-gray-100 text-sm md:text-base">
               <Layers size={16} className="md:w-5 md:h-5 text-indigo-600"/> 위젯 라이브러리
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
               {(['FINANCE', 'ASSET', 'OPERATION', 'FACILITY'] as WidgetCategory[]).map(category => (
                  <div key={category}>
                     <h4 className="text-[8px] md:text-xs font-bold text-gray-400 uppercase mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                        <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-gray-300"></span>
                        {category}
                     </h4>
                     <div className="space-y-1.5 md:space-y-2">
                        {WIDGETS.filter(w => w.category === category).map(w => (
                           <label key={w.id} className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg border cursor-pointer transition-all ${activeWidgetIds.includes(w.id) ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                              <input
                                type="checkbox"
                                checked={activeWidgetIds.includes(w.id)}
                                onChange={() => toggleWidget(w.id)}
                                className="w-3 md:w-4 h-3 md:h-4 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <span className={`text-[9px] md:text-sm font-medium leading-tight ${activeWidgetIds.includes(w.id) ? 'text-indigo-900' : 'text-gray-600'}`}>
                                 {w.title}
                              </span>
                           </label>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* Dashboard Grid - RESPONSIVE LAYOUT FIX */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6">
         {activeWidgets.map(widget => (
            <div key={widget.id} className={`bg-white rounded-xl md:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 flex flex-col overflow-hidden ${widget.className}`}>
               <div className="p-3 md:p-4 border-b border-gray-50 flex justify-between items-center bg-white">
                  <h3 className="font-bold text-gray-800 text-[10px] md:text-sm flex items-center gap-1.5 md:gap-2">
                     {widget.title}
                  </h3>
                  {isEditMode && (
                     <button onClick={() => toggleWidget(widget.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                        <X size={14} className="md:w-4 md:h-4"/>
                     </button>
                  )}
               </div>
               <div className="p-3 md:p-5 flex-1 relative">
                  {widget.render(props)}
               </div>
            </div>
         ))}

         {activeWidgets.length === 0 && (
            <div className="col-span-1 md:col-span-2 xl:col-span-4 py-10 md:py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl md:rounded-2xl bg-gray-50/50">
               <Settings size={32} className="md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-20"/>
               <p className="font-medium text-xs md:text-base">선택된 위젯이 없습니다.</p>
               <p className="text-[10px] md:text-sm mt-1">'위젯 설정' 버튼을 눌러 홈 화면을 꾸며보세요.</p>
            </div>
         )}
      </div>
    </div>
  );
};
