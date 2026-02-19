
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Property, ValuationHistory, MarketComparable, AreaUnit } from '../types';
import { TrendingUp, Plus, X, Calculator, Info } from 'lucide-react';

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>,
    document.body
  );
};

interface ValuationManagerProps {
  properties: Property[];
  valuations: ValuationHistory[];
  comparables: MarketComparable[];
  onAddValuation: (v: ValuationHistory) => void;
  onUpdateValuation: (v: ValuationHistory) => void;
  onDeleteValuation: (id: string) => void;
  onAddComparable: (c: MarketComparable) => void;
  formatMoney: (amount: number) => string;
  formatArea: (area: number) => string;
  formatNumberInput: (num: number | undefined | null) => string;
  parseNumberInput: (str: string) => number;
  formatMoneyInput: (amount: number | undefined | null) => string;
  parseMoneyInput: (str: string) => number;
  moneyLabel: string;
  areaUnit: AreaUnit;
}

export const ValuationManager: React.FC<ValuationManagerProps> = ({
  properties, valuations, formatMoney
}) => {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl border border-[#dadce0] shadow-sm">
         <div>
            <h2 className="text-xl font-bold text-[#3c4043]">자산 가치 및 공시지가 관리</h2>
            <p className="text-sm text-[#5f6368] mt-1">연도별 공시지가 추이 및 시장 감정가 통합 분석</p>
         </div>
         <button className="bg-[#1a73e8] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1557b0] shadow-sm transition-all"><Plus size={18}/> 가치 평가 추가</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-[#dadce0] shadow-sm">
          <h3 className="font-bold text-[#3c4043] mb-4 flex items-center gap-2 border-b pb-4"><TrendingUp size={18} className="text-[#1a73e8]"/> 최근 평가 리스트</h3>
          <div className="space-y-4">
            {valuations.map(v => (
              <div key={v.id} className="p-4 bg-gray-50 rounded-xl border border-[#dadce0] flex justify-between items-center">
                <div>
                   <span className="text-[10px] font-bold text-[#1a73e8] uppercase">{v.year}년도</span>
                   <p className="text-sm font-bold text-[#202124] mt-0.5">{v.targetType === 'LOT' ? '토지 평가' : '건물 평가'}</p>
                   <p className="text-xs text-[#5f6368] mt-1">{v.note}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-gray-400">시장가</p>
                   <p className="font-bold text-[#1a73e8]">{formatMoney(v.marketValue || 0)}</p>
                </div>
              </div>
            ))}
            {valuations.length === 0 && <p className="text-center py-10 text-gray-400">데이터가 없습니다.</p>}
          </div>
        </div>
      </div>

      {deleteTargetId && (
        <Modal onClose={() => setDeleteTargetId(null)} disableOverlayClick={true}>
           <div className="bg-white p-8 animate-in zoom-in-95 duration-200 rounded-xl shadow-2xl">
             <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h3 className="text-lg font-bold text-[#202124]">내역 삭제 확인</h3>
                <button onClick={() => setDeleteTargetId(null)} className="text-[#5f6368] hover:bg-[#f1f3f4] p-1 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <p className="text-[#5f6368] text-sm mb-8">선택한 평가 내역을 삭제하시겠습니까?<br/>이 작업은 되돌릴 수 없습니다.</p>
             <div className="flex justify-end gap-3">
               <button onClick={() => setDeleteTargetId(null)} className="px-5 py-2.5 bg-gray-100 text-[#5f6368] rounded-lg text-sm font-bold hover:bg-[#e8eaed]">취소</button>
               <button onClick={() => setDeleteTargetId(null)} className="px-5 py-2.5 bg-[#ea4335] text-white rounded-lg text-sm font-bold hover:bg-[#c5221f]">영구 삭제</button>
             </div>
           </div>
        </Modal>
      )}
    </div>
  );
};
