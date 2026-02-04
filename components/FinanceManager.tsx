
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PaymentTransaction, LeaseContract, Stakeholder, Unit, Property, UtilityContract, MaintenanceContract } from '../types';
import { X, Plus, AlertCircle, Wallet, CheckCircle, Clock, ArrowDownLeft, ReceiptText, Calendar } from 'lucide-react';

const Modal = ({ children, onClose, disableOverlayClick = false }: { children?: React.ReactNode, onClose: () => void, disableOverlayClick?: boolean }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={disableOverlayClick ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>,
    document.body
  );
};

interface FinanceManagerProps {
  transactions: PaymentTransaction[];
  contracts: LeaseContract[];
  utilityContracts?: UtilityContract[];
  maintenanceContracts?: MaintenanceContract[];
  stakeholders: Stakeholder[];
  units: Unit[];
  properties: Property[];
  onUpdateStatus: (id: string, status: 'PAID' | 'UNPAID' | 'OVERDUE') => void;
  onUpdateTransaction: (tx: PaymentTransaction) => void;
  onGenerateBills: (txs: PaymentTransaction[]) => void;
  formatMoney: (amount: number) => string;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({ 
  transactions, onUpdateStatus, formatMoney, stakeholders
}) => {
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#dadce0] shadow-sm">
         <div>
            <h2 className="text-xl font-black text-[#3c4043] flex items-center gap-2"><Wallet size={24} className="text-[#34a853]"/> 재무 건전성 및 수납 관리</h2>
            <p className="text-sm text-[#5f6368] mt-1 font-medium">임대료, 관리비, 유지보수비 청구 이력 및 실시간 수납 상태 추적</p>
         </div>
         <button onClick={() => setIsBillModalOpen(true)} className="bg-[#1a73e8] text-white px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-[#1557b0] shadow-xl transition-all active:scale-95"><Plus size={18}/> 개별 청구서 발행</button>
      </div>

      <div className="bg-white rounded-2xl border border-[#dadce0] shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
           <thead className="bg-[#f8f9fa] border-b border-[#dadce0] text-[11px] font-black text-[#5f6368] uppercase tracking-widest">
              <tr>
                <th className="p-5">청구 월</th>
                <th className="p-5">청구 항목 / 대상</th>
                <th className="p-5 text-right">금액 (VAT 포함)</th>
                <th className="p-5">수납 기한</th>
                <th className="p-5 text-center">수납 제어</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-[#f1f3f4]">
              {transactions.sort((a,b) => b.targetMonth.localeCompare(a.targetMonth)).map(tx => {
                const isPaid = tx.status === 'PAID';
                return (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-5 font-black text-[#202124]">{tx.targetMonth}</td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2 text-[#5f6368] font-black text-xs uppercase mb-1">
                            <div className={`w-2 h-2 rounded-full ${tx.type === 'RENT' ? 'bg-[#1a73e8]' : tx.type === 'ADMIN_FEE' ? 'bg-[#34a853]' : 'bg-[#ea4335]'}`}></div>
                            {tx.type === 'RENT' ? '임대료' : tx.type === 'ADMIN_FEE' ? '관리비' : tx.type === 'MAINTENANCE_COST' ? '유지보수비' : '기타'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">TX-ID: {tx.id.substring(0, 8)}</span>
                      </div>
                    </td>
                    <td className="p-5 text-right font-black text-gray-900 text-base">{formatMoney(Math.abs(tx.amount))}</td>
                    <td className="p-5">
                      <div className="flex flex-col items-start">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${!isPaid && new Date(tx.dueDate) < new Date() ? 'text-[#ea4335]' : 'text-gray-500'}`}>
                           <Calendar size={14}/> {tx.dueDate}
                        </span>
                        {isPaid && tx.paidDate && <span className="text-[10px] text-[#34a853] font-bold mt-1">완납일: {tx.paidDate}</span>}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => onUpdateStatus(tx.id, isPaid ? 'UNPAID' : 'PAID')}
                        className={`px-5 py-2 rounded-xl text-[11px] font-black border-2 transition-all hover:shadow-lg active:scale-95 min-w-[100px] ${isPaid ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' : 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf] shadow-inner'}`}
                      >
                        {isPaid ? '수납 완료' : '미납 (전환)'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className="p-40 text-center text-gray-300 font-bold italic">금융 거래 내역이 비어 있습니다.</td></tr>
              )}
           </tbody>
        </table>
      </div>

      {isBillModalOpen && (
         <Modal onClose={() => setIsBillModalOpen(false)} disableOverlayClick={true}>
            <div className="flex flex-col">
               <div className="p-6 border-b border-[#dadce0] bg-[#f8f9fa] flex justify-between items-center">
                  <h3 className="font-black text-lg text-[#3c4043] flex items-center gap-3">
                     <ReceiptText size={24} className="text-[#1a73e8]"/> 정밀 청구 시스템 발행
                  </h3>
                  <button onClick={() => setIsBillModalOpen(false)} className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
               </div>
               <div className="p-16 text-center bg-white space-y-8">
                  <div className="w-20 h-20 bg-blue-50 text-[#1a73e8] rounded-3xl flex items-center justify-center mx-auto border-2 border-blue-100 shadow-inner">
                    <AlertCircle size={40}/>
                  </div>
                  <div className="space-y-3">
                    <p className="font-black text-xl text-gray-900">금융 모듈 데이터 연동 중</p>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto font-medium">현재는 등록된 계약 정보를 바탕으로 시스템이 자동 생성한 거래 내역의 수납 제어만 가능합니다. 수동 발행 기능은 점검 중입니다.</p>
                  </div>
               </div>
               <div className="p-6 border-t border-[#dadce0] bg-[#f8f9fa] flex justify-end gap-3">
                  <button onClick={() => setIsBillModalOpen(false)} className="px-8 py-3 bg-white border border-[#dadce0] text-[#5f6368] font-black rounded-xl hover:bg-gray-50 transition-colors">취소</button>
                  <button onClick={() => setIsBillModalOpen(false)} className="px-14 py-3 bg-[#1a73e8] text-white font-black rounded-xl shadow-xl hover:bg-[#1557b0] transition-all active:scale-95">확인</button>
               </div>
            </div>
         </Modal>
      )}
    </div>
  );
};
