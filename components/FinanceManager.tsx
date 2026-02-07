
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
    <div className="space-y-3 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-[#dadce0] shadow-sm">
         <div>
            <h2 className="text-base md:text-xl font-black text-[#3c4043] flex items-center gap-2"><Wallet size={20} className="md:w-6 md:h-6 text-[#34a853]"/> 수납 관리</h2>
            <p className="text-[10px] md:text-sm text-[#5f6368] mt-1 font-medium hidden md:block">임대료, 관리비, 유지보수비 청구 이력 및 실시간 수납 상태 추적</p>
         </div>
         <button onClick={() => setIsBillModalOpen(true)} className="bg-[#1a73e8] text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-sm font-black flex items-center gap-1 md:gap-2 hover:bg-[#1557b0] shadow-xl transition-all active:scale-95 whitespace-nowrap"><Plus size={14} className="md:w-[18px] md:h-[18px]"/> 청구서 발행</button>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl border border-[#dadce0] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-xs md:text-sm text-left min-w-[500px]">
           <thead className="bg-[#f8f9fa] border-b border-[#dadce0] text-[8px] md:text-[11px] font-black text-[#5f6368] uppercase tracking-wide md:tracking-widest">
              <tr>
                <th className="p-2 md:p-5 whitespace-nowrap">청구 월</th>
                <th className="p-2 md:p-5 whitespace-nowrap">항목</th>
                <th className="p-2 md:p-5 text-right whitespace-nowrap">금액</th>
                <th className="p-2 md:p-5 whitespace-nowrap">기한</th>
                <th className="p-2 md:p-5 text-center whitespace-nowrap">수납</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-[#f1f3f4]">
              {transactions.sort((a,b) => b.targetMonth.localeCompare(a.targetMonth)).map(tx => {
                const isPaid = tx.status === 'PAID';
                return (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-2 md:p-5 font-black text-[10px] md:text-sm text-[#202124] whitespace-nowrap">{tx.targetMonth}</td>
                    <td className="p-2 md:p-5">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 md:gap-2 text-[#5f6368] font-black text-[9px] md:text-xs uppercase mb-0.5 md:mb-1">
                            <div className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${tx.type === 'RENT' ? 'bg-[#1a73e8]' : tx.type === 'ADMIN_FEE' ? 'bg-[#34a853]' : 'bg-[#ea4335]'}`}></div>
                            {tx.type === 'RENT' ? '임대료' : tx.type === 'ADMIN_FEE' ? '관리비' : tx.type === 'MAINTENANCE_COST' ? '유지보수' : '기타'}
                        </span>
                        <span className="text-[8px] md:text-[10px] text-gray-400 font-bold hidden md:block">TX: {tx.id.substring(0, 8)}</span>
                      </div>
                    </td>
                    <td className="p-2 md:p-5 text-right font-black text-[10px] md:text-base text-gray-900 whitespace-nowrap tracking-tight">{formatMoney(Math.abs(tx.amount))}</td>
                    <td className="p-2 md:p-5">
                      <div className="flex flex-col items-start">
                        <span className={`flex items-center gap-1 text-[9px] md:text-xs font-bold whitespace-nowrap ${!isPaid && new Date(tx.dueDate) < new Date() ? 'text-[#ea4335]' : 'text-gray-500'}`}>
                           <Calendar size={10} className="md:w-3.5 md:h-3.5 hidden md:block"/> {tx.dueDate}
                        </span>
                        {isPaid && tx.paidDate && <span className="text-[8px] md:text-[10px] text-[#34a853] font-bold mt-0.5 md:mt-1 hidden md:block">완납: {tx.paidDate}</span>}
                      </div>
                    </td>
                    <td className="p-2 md:p-5 text-center">
                      <button
                        onClick={() => onUpdateStatus(tx.id, isPaid ? 'UNPAID' : 'PAID')}
                        className={`px-2 md:px-5 py-1 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black border-2 transition-all hover:shadow-lg active:scale-95 whitespace-nowrap ${isPaid ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' : 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf] shadow-inner'}`}
                      >
                        {isPaid ? '완료' : '미납'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className="p-16 md:p-40 text-center text-gray-300 font-bold italic text-xs md:text-sm">금융 거래 내역이 비어 있습니다.</td></tr>
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
