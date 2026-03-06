
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Property, ValuationHistory, MarketComparable, AreaUnit, ValuationIndicatorType } from '../types';
import { TrendingUp, Plus, X, Layers, Edit2, Trash2, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 지표 라벨/색상
const INDICATOR_LABELS: Record<ValuationIndicatorType, string> = {
  OFFICIAL_LAND_PRICE: '공시지가',
  OFFICIAL_BUILDING_PRICE: '시가표준액',
  ACTUAL_TRANSACTION: '실거래가',
  MARKET_ASKING_PRICE: '시장호가',
  APPRAISAL: '감정가',
};
const INDICATOR_COLORS: Record<ValuationIndicatorType, string> = {
  OFFICIAL_LAND_PRICE: '#34a853',
  OFFICIAL_BUILDING_PRICE: '#4285f4',
  ACTUAL_TRANSACTION: '#ea4335',
  MARKET_ASKING_PRICE: '#fbbc05',
  APPRAISAL: '#9c27b0',
};
const ALL_INDICATORS: ValuationIndicatorType[] = ['OFFICIAL_LAND_PRICE', 'OFFICIAL_BUILDING_PRICE', 'ACTUAL_TRANSACTION', 'MARKET_ASKING_PRICE', 'APPRAISAL'];

// 레거시 데이터의 indicatorType 자동 분류
function resolveIndicatorType(v: ValuationHistory): ValuationIndicatorType {
  if (v.indicatorType) return v.indicatorType;
  if (v.targetType === 'LOT') return 'OFFICIAL_LAND_PRICE';
  return 'OFFICIAL_BUILDING_PRICE';
}

interface ValuationManagerProps {
  properties: Property[];
  valuations: ValuationHistory[];
  comparables: MarketComparable[];
  onAddValuation: (v: ValuationHistory) => void;
  onUpdateValuation: (v: ValuationHistory) => void;
  onDeleteValuation: (id: string) => void;
  onAddComparable: (c: MarketComparable) => void;
  onUpdateComparable: (c: MarketComparable) => void;
  onDeleteComparable: (id: string) => void;
  formatMoney: (amount: number) => string;
  formatArea: (area: number) => string;
  formatNumberInput: (num: number | undefined | null) => string;
  parseNumberInput: (str: string) => number;
  formatMoneyInput: (amount: number | undefined | null) => string;
  parseMoneyInput: (str: string) => number;
  moneyLabel: string;
  areaUnit: AreaUnit;
}

const EMPTY_FORM = {
  targetId: '', targetType: 'LOT' as 'LOT' | 'BUILDING',
  indicatorType: 'OFFICIAL_LAND_PRICE' as ValuationIndicatorType,
  year: new Date().getFullYear(), officialValue: '', marketValue: '', source: '', note: '',
};

const EMPTY_COMP = {
  name: '', address: '', date: '', deposit: '', monthlyRent: '', adminFee: '', area: '', floor: '', distance: '', note: '',
};

export const ValuationManager: React.FC<ValuationManagerProps> = ({
  properties, valuations, comparables,
  onAddValuation, onUpdateValuation, onDeleteValuation,
  onAddComparable, onUpdateComparable, onDeleteComparable,
  formatMoney, formatArea, formatNumberInput, parseNumberInput, formatMoneyInput, parseMoneyInput, moneyLabel, areaUnit,
}) => {
  const [selectedPropId, setSelectedPropId] = useState<string>(properties[0]?.id || '');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedTargetType, setSelectedTargetType] = useState<'LOT' | 'BUILDING'>('LOT');
  const [activeIndicator, setActiveIndicator] = useState<ValuationIndicatorType | 'ALL'>('ALL');

  // 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingValuation, setEditingValuation] = useState<ValuationHistory | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // 비교사례 모달
  const [showCompModal, setShowCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState<MarketComparable | null>(null);
  const [compForm, setCompForm] = useState(EMPTY_COMP);

  const selectedProperty = properties.find(p => p.id === selectedPropId);

  // 대상 목록 (토지+건물)
  const targets = useMemo(() => {
    if (!selectedProperty) return [];
    const list: { id: string; type: 'LOT' | 'BUILDING'; label: string; area?: number }[] = [];
    selectedProperty.lots.forEach(l => {
      const addr = `${l.address.eupMyeonDong} ${l.address.bonbun}${l.address.bubun ? '-' + l.address.bubun : ''}`;
      list.push({ id: l.id, type: 'LOT', label: `토지: ${addr}`, area: l.area });
    });
    selectedProperty.buildings.forEach(b => {
      list.push({ id: b.id, type: 'BUILDING', label: `건물: ${b.name}`, area: b.spec.grossFloorArea });
    });
    return list;
  }, [selectedProperty]);

  // 선택된 대상이 없거나 유효하지 않으면 첫 번째 대상 선택
  const effectiveTarget = targets.find(t => t.id === selectedTargetId) || targets[0];

  // 해당 대상의 가치평가 이력 (필터)
  const filteredValuations = useMemo(() => {
    if (!effectiveTarget) return [];
    let list = valuations.filter(v => v.targetId === effectiveTarget.id);
    if (activeIndicator !== 'ALL') {
      list = list.filter(v => resolveIndicatorType(v) === activeIndicator);
    }
    return list.sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
  }, [valuations, effectiveTarget, activeIndicator]);

  // 차트 데이터
  const chartData = useMemo(() => {
    if (!effectiveTarget) return [];
    const targetVals = valuations.filter(v => v.targetId === effectiveTarget.id);
    const yearSet = new Set(targetVals.map(v => v.year));
    const years = Array.from(yearSet).sort();
    return years.map(year => {
      const entry: Record<string, any> = { year: `${year}` };
      for (const ind of ALL_INDICATORS) {
        const match = targetVals.find(v => v.year === year && resolveIndicatorType(v) === ind);
        if (match) entry[ind] = match.officialValue;
      }
      return entry;
    });
  }, [valuations, effectiveTarget]);

  // 해당 물건의 비교사례
  const propComparables = comparables.filter(c => c.propertyId === selectedPropId);

  // 물건별 가치평가 건수
  const propValCount = (propId: string) => {
    const prop = properties.find(p => p.id === propId);
    if (!prop) return 0;
    const ids = [...prop.lots.map(l => l.id), ...prop.buildings.map(b => b.id)];
    return valuations.filter(v => ids.includes(v.targetId)).length;
  };

  // ── 가치평가 CRUD ──
  const openAddModal = () => {
    const t = effectiveTarget || targets[0];
    setForm({
      ...EMPTY_FORM,
      targetId: t?.id || '',
      targetType: t?.type || 'LOT',
    });
    setEditingValuation(null);
    setShowAddModal(true);
  };

  const openEditModal = (v: ValuationHistory) => {
    setForm({
      targetId: v.targetId,
      targetType: v.targetType as 'LOT' | 'BUILDING',
      indicatorType: resolveIndicatorType(v),
      year: v.year,
      officialValue: v.officialValue?.toString() || '',
      marketValue: v.marketValue?.toString() || '',
      source: v.source || '',
      note: v.note || '',
    });
    setEditingValuation(v);
    setShowAddModal(true);
  };

  const handleSaveValuation = () => {
    const val: ValuationHistory = {
      id: editingValuation?.id || `val-${Date.now()}`,
      targetId: form.targetId,
      targetType: form.targetType,
      year: form.year,
      officialValue: parseMoneyInput(form.officialValue),
      marketValue: form.marketValue ? parseMoneyInput(form.marketValue) : undefined,
      indicatorType: form.indicatorType,
      source: form.source || undefined,
      note: form.note || undefined,
    };
    if (editingValuation) onUpdateValuation(val);
    else onAddValuation(val);
    setShowAddModal(false);
  };

  // ── 비교사례 CRUD ──
  const openCompAdd = () => {
    setCompForm(EMPTY_COMP);
    setEditingComp(null);
    setShowCompModal(true);
  };

  const openCompEdit = (c: MarketComparable) => {
    setCompForm({
      name: c.name, address: c.address || '', date: c.date, deposit: c.deposit.toString(),
      monthlyRent: c.monthlyRent.toString(), adminFee: c.adminFee.toString(),
      area: c.area.toString(), floor: c.floor.toString(), distance: c.distance.toString(), note: c.note || '',
    });
    setEditingComp(c);
    setShowCompModal(true);
  };

  const handleSaveComp = () => {
    const comp: MarketComparable = {
      id: editingComp?.id || `comp-${Date.now()}`,
      propertyId: selectedPropId,
      name: compForm.name,
      address: compForm.address,
      date: compForm.date,
      deposit: parseMoneyInput(compForm.deposit),
      monthlyRent: parseMoneyInput(compForm.monthlyRent),
      adminFee: parseMoneyInput(compForm.adminFee),
      area: parseNumberInput(compForm.area),
      floor: parseNumberInput(compForm.floor),
      distance: parseNumberInput(compForm.distance),
      note: compForm.note || undefined,
    };
    if (editingComp) onUpdateComparable(comp);
    else onAddComparable(comp);
    setShowCompModal(false);
  };

  // 면적당 단가
  const unitPrice = (v: ValuationHistory) => {
    const target = targets.find(t => t.id === v.targetId);
    if (!target?.area || !v.officialValue) return null;
    return v.officialValue / target.area;
  };

  // 차트에 실제 사용된 지표만
  const activeChartIndicators = useMemo(() => {
    if (!effectiveTarget) return [];
    const targetVals = valuations.filter(v => v.targetId === effectiveTarget.id);
    return ALL_INDICATORS.filter(ind => targetVals.some(v => resolveIndicatorType(v) === ind));
  }, [valuations, effectiveTarget]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 h-full">
      {/* ── 사이드바: 물건 목록 ── */}
      <div className="lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
          <div className="px-3 md:px-4 py-2.5 border-b border-[#dadce0] bg-[#f8f9fa]">
            <h3 className="font-black text-xs md:text-sm text-[#202124] flex items-center gap-1.5">
              <Layers size={14} className="text-[#1a73e8]"/> 물건 목록
            </h3>
          </div>
          <div className="divide-y divide-[#f1f3f4]">
            {properties.map(p => {
              const cnt = propValCount(p.id);
              return (
                <button key={p.id}
                  onClick={() => { setSelectedPropId(p.id); setSelectedTargetId(''); setActiveIndicator('ALL'); }}
                  className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 transition-colors ${selectedPropId === p.id ? 'bg-[#e8f0fe]' : 'hover:bg-[#f8f9fa]'}`}>
                  <div className="font-bold text-xs md:text-sm text-[#202124] truncate">{p.name}</div>
                  <div className="text-[10px] md:text-xs text-[#5f6368] truncate mt-0.5">
                    {p.roadAddress || `${p.masterAddress.eupMyeonDong} ${p.masterAddress.bonbun}`}
                  </div>
                  {cnt > 0 && <span className="text-[10px] text-[#1a73e8] font-bold">{cnt}건</span>}
                </button>
              );
            })}
            {properties.length === 0 && <div className="p-4 text-center text-xs text-[#9aa0a6]">물건이 없습니다.</div>}
          </div>
        </div>
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {selectedProperty ? (
          <>
            {/* 물건 헤더 */}
            <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm px-4 md:px-6 py-3">
              <h2 className="font-black text-sm md:text-base text-[#202124]">{selectedProperty.name}</h2>
              <p className="text-xs text-[#5f6368] mt-0.5">
                {selectedProperty.roadAddress || `${selectedProperty.masterAddress.sido} ${selectedProperty.masterAddress.sigungu} ${selectedProperty.masterAddress.eupMyeonDong}`}
              </p>
            </div>

            {/* 대상 선택 (토지/건물 버튼) */}
            {targets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {targets.map(t => (
                  <button key={t.id}
                    onClick={() => { setSelectedTargetId(t.id); setSelectedTargetType(t.type); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      (effectiveTarget?.id === t.id) ? 'bg-[#e8f0fe] border-[#1a73e8] text-[#1a73e8]' : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa]'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* 지표 탭 */}
            <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
              <div className="flex items-center border-b border-[#dadce0] overflow-x-auto">
                {(['ALL', ...ALL_INDICATORS] as const).map(ind => {
                  const label = ind === 'ALL' ? '전체' : INDICATOR_LABELS[ind];
                  const isActive = activeIndicator === ind;
                  return (
                    <button key={ind} onClick={() => setActiveIndicator(ind)}
                      className={`px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${isActive ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-[#5f6368] hover:text-[#202124]'}`}>
                      {label}
                    </button>
                  );
                })}
                <div className="flex-1"/>
                <button onClick={openAddModal}
                  className="mr-2 px-2 md:px-3 py-1 bg-[#1a73e8] text-white rounded text-xs font-bold hover:bg-[#1557b0] flex items-center gap-1 whitespace-nowrap my-1">
                  <Plus size={12}/> 추가
                </button>
              </div>

              {/* 추이 차트 */}
              {chartData.length > 0 && activeChartIndicators.length > 0 && (
                <div className="p-4" style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4"/>
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="#9aa0a6"/>
                      <YAxis tick={{ fontSize: 10 }} stroke="#9aa0a6" tickFormatter={(v: number) => {
                        if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
                        if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
                        return v.toLocaleString();
                      }}/>
                      <Tooltip formatter={(v: number) => formatMoney(v)} labelFormatter={l => `${l}년`}/>
                      <Legend formatter={(v: string) => INDICATOR_LABELS[v as ValuationIndicatorType] || v} iconSize={10} wrapperStyle={{ fontSize: 11 }}/>
                      {activeChartIndicators
                        .filter(ind => activeIndicator === 'ALL' || activeIndicator === ind)
                        .map(ind => (
                          <Line key={ind} type="monotone" dataKey={ind} stroke={INDICATOR_COLORS[ind]}
                            strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls/>
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 이력 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm min-w-[500px]">
                  <thead className="bg-[#f8f9fa] border-y border-[#dadce0]">
                    <tr className="text-[8px] md:text-[10px] text-[#5f6368] uppercase font-bold tracking-tight">
                      <th className="p-1.5 md:p-3 text-center">연도</th>
                      <th className="p-1.5 md:p-3 text-left">지표</th>
                      <th className="p-1.5 md:p-3 text-right">가격</th>
                      <th className="p-1.5 md:p-3 text-right hidden md:table-cell">㎡당 단가</th>
                      <th className="p-1.5 md:p-3 text-left hidden md:table-cell">출처</th>
                      <th className="p-1.5 md:p-3 text-left">비고</th>
                      <th className="p-1.5 md:p-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f4]">
                    {filteredValuations.map(v => {
                      const indType = resolveIndicatorType(v);
                      const up = unitPrice(v);
                      return (
                        <tr key={v.id} className="hover:bg-[#f8f9fa]">
                          <td className="p-1.5 md:p-3 text-center font-bold text-[#202124]">{v.year}</td>
                          <td className="p-1.5 md:p-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: INDICATOR_COLORS[indType] + '20', color: INDICATOR_COLORS[indType] }}>
                              {INDICATOR_LABELS[indType]}
                            </span>
                          </td>
                          <td className="p-1.5 md:p-3 text-right font-bold text-[#202124] whitespace-nowrap">{formatMoney(v.officialValue)}</td>
                          <td className="p-1.5 md:p-3 text-right text-[#5f6368] whitespace-nowrap hidden md:table-cell">
                            {up ? formatMoney(Math.round(up)) + '/㎡' : '-'}
                          </td>
                          <td className="p-1.5 md:p-3 text-[#5f6368] hidden md:table-cell">{v.source || '-'}</td>
                          <td className="p-1.5 md:p-3 text-[#5f6368] truncate max-w-[120px]">{v.note || '-'}</td>
                          <td className="p-1.5 md:p-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEditModal(v)}
                                className="p-0.5 hover:bg-[#e8f0fe] rounded text-[#9aa0a6] hover:text-[#1a73e8]"><Edit2 size={12}/></button>
                              <button onClick={() => { if (confirm('이 평가를 삭제하시겠습니까?')) onDeleteValuation(v.id); }}
                                className="p-0.5 hover:bg-red-50 rounded text-[#c4c7cc] hover:text-red-500"><Trash2 size={12}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredValuations.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-xs text-[#9aa0a6]">가치평가 이력이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 시장 비교 사례 */}
            <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
                <h3 className="font-black text-xs md:text-sm text-[#202124] flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#1a73e8]"/> 시장 비교 사례
                </h3>
                <button onClick={openCompAdd}
                  className="px-2 md:px-3 py-1 bg-[#1a73e8] text-white rounded text-xs font-bold hover:bg-[#1557b0] flex items-center gap-1">
                  <Plus size={12}/> 추가
                </button>
              </div>
              <div className="p-3 md:p-4">
                {propComparables.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {propComparables.map(c => (
                      <div key={c.id} className="border border-[#dadce0] rounded-lg p-3 hover:border-[#1a73e8] transition-colors group">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-bold text-xs md:text-sm text-[#202124]">{c.name}</div>
                            {c.address && <div className="text-[10px] text-[#5f6368] mt-0.5">{c.address}</div>}
                          </div>
                          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openCompEdit(c)} className="p-0.5 hover:bg-[#e8f0fe] rounded text-[#9aa0a6] hover:text-[#1a73e8]"><Edit2 size={12}/></button>
                            <button onClick={() => { if (confirm('삭제하시겠습니까?')) onDeleteComparable(c.id); }}
                              className="p-0.5 hover:bg-red-50 rounded text-[#c4c7cc] hover:text-red-500"><Trash2 size={12}/></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] md:text-xs">
                          <div><span className="text-[#9aa0a6]">보증금</span><br/><span className="font-bold">{formatMoney(c.deposit)}</span></div>
                          <div><span className="text-[#9aa0a6]">월차임</span><br/><span className="font-bold">{formatMoney(c.monthlyRent)}</span></div>
                          <div><span className="text-[#9aa0a6]">관리비</span><br/><span className="font-bold">{formatMoney(c.adminFee)}</span></div>
                          <div><span className="text-[#9aa0a6]">면적</span><br/><span className="font-bold">{formatArea(c.area)}</span></div>
                          <div><span className="text-[#9aa0a6]">층</span><br/><span className="font-bold">{c.floor}층</span></div>
                          <div><span className="text-[#9aa0a6]">거리</span><br/><span className="font-bold">{c.distance}m</span></div>
                        </div>
                        {c.note && <div className="text-[10px] text-[#9aa0a6] mt-2 truncate">{c.note}</div>}
                        <div className="text-[10px] text-[#9aa0a6] mt-1">{c.date}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#9aa0a6]">비교 사례가 없습니다.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm p-8 text-center text-[#9aa0a6]">
            왼쪽에서 물건을 선택하세요.
          </div>
        )}
      </div>

      {/* ── 가치평가 추가/수정 모달 ── */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
              <h3 className="font-black text-sm text-[#202124]">{editingValuation ? '가치평가 수정' : '가치평가 추가'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#e8eaed] rounded-full"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              {/* 대상 */}
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">대상</label>
                <select value={form.targetId}
                  onChange={e => {
                    const t = targets.find(t => t.id === e.target.value);
                    setForm(f => ({ ...f, targetId: e.target.value, targetType: t?.type || 'LOT' }));
                  }}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]">
                  {targets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              {/* 지표 유형 */}
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">지표 유형</label>
                <select value={form.indicatorType}
                  onChange={e => setForm(f => ({ ...f, indicatorType: e.target.value as ValuationIndicatorType }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]">
                  {ALL_INDICATORS.map(ind => <option key={ind} value={ind}>{INDICATOR_LABELS[ind]}</option>)}
                </select>
              </div>
              {/* 연도 */}
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">연도</label>
                <input type="number" value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]"
                  min={1990} max={2099}/>
              </div>
              {/* 가격 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">가격 (원)</label>
                  <input type="text" value={form.officialValue} placeholder="0"
                    onChange={e => setForm(f => ({ ...f, officialValue: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">시장가 (원, 선택)</label>
                  <input type="text" value={form.marketValue} placeholder="0"
                    onChange={e => setForm(f => ({ ...f, marketValue: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
              </div>
              {/* 출처 */}
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">출처</label>
                <input type="text" value={form.source} placeholder="국토부, 등기부등본 등"
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]"/>
              </div>
              {/* 비고 */}
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">비고</label>
                <input type="text" value={form.note} placeholder="메모"
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]"/>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[#dadce0] flex justify-end gap-2 bg-[#f8f9fa]">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-1.5 bg-[#f1f3f4] text-[#5f6368] rounded-lg text-xs font-bold hover:bg-[#e8eaed]">취소</button>
              <button onClick={handleSaveValuation}
                disabled={!form.targetId || !form.officialValue}
                className="px-4 py-1.5 bg-[#1a73e8] text-white rounded-lg text-xs font-bold hover:bg-[#1557b0] disabled:opacity-40">저장</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 비교사례 추가/수정 모달 ── */}
      {showCompModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowCompModal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
              <h3 className="font-black text-sm text-[#202124]">{editingComp ? '비교사례 수정' : '비교사례 추가'}</h3>
              <button onClick={() => setShowCompModal(false)} className="p-1 hover:bg-[#e8eaed] rounded-full"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">건물명</label>
                <input type="text" value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]"/>
              </div>
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">주소</label>
                <input type="text" value={compForm.address} onChange={e => setCompForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]"/>
              </div>
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">일자</label>
                <input type="date" value={compForm.date} onChange={e => setCompForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]"/>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">보증금 (원)</label>
                  <input type="text" value={compForm.deposit} onChange={e => setCompForm(f => ({ ...f, deposit: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">월차임 (원)</label>
                  <input type="text" value={compForm.monthlyRent} onChange={e => setCompForm(f => ({ ...f, monthlyRent: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">관리비 (원)</label>
                  <input type="text" value={compForm.adminFee} onChange={e => setCompForm(f => ({ ...f, adminFee: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">면적 (㎡)</label>
                  <input type="text" value={compForm.area} onChange={e => setCompForm(f => ({ ...f, area: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">층</label>
                  <input type="text" value={compForm.floor} onChange={e => setCompForm(f => ({ ...f, floor: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5f6368] block mb-1">거리 (m)</label>
                  <input type="text" value={compForm.distance} onChange={e => setCompForm(f => ({ ...f, distance: e.target.value }))}
                    className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#1a73e8]"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#5f6368] block mb-1">비고</label>
                <input type="text" value={compForm.note} onChange={e => setCompForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-[#dadce0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8]"/>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[#dadce0] flex justify-end gap-2 bg-[#f8f9fa]">
              <button onClick={() => setShowCompModal(false)} className="px-4 py-1.5 bg-[#f1f3f4] text-[#5f6368] rounded-lg text-xs font-bold hover:bg-[#e8eaed]">취소</button>
              <button onClick={handleSaveComp}
                disabled={!compForm.name}
                className="px-4 py-1.5 bg-[#1a73e8] text-white rounded-lg text-xs font-bold hover:bg-[#1557b0] disabled:opacity-40">저장</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
