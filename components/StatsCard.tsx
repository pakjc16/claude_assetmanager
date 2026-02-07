
import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  subValue?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, trendUp, subValue }) => {
  return (
    <div className="bg-white p-3 md:p-6 rounded-lg md:rounded-xl border border-[#dadce0] transition-shadow hover:shadow-md h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2 md:mb-4">
        <div>
          <p className="text-[8px] md:text-[11px] font-bold text-[#5f6368] uppercase tracking-wide md:tracking-widest whitespace-nowrap">{title}</p>
          <h3 className="text-base md:text-2xl font-bold text-[#202124] mt-1 md:mt-2">{value}</h3>
          {subValue && <p className="text-[8px] md:text-xs text-[#70757a] mt-1 md:mt-1.5 font-medium">{subValue}</p>}
        </div>
        <div className="p-2 md:p-3 bg-[#f8f9fa] rounded-lg text-[#5f6368] border border-[#f1f3f4]">
          {icon}
        </div>
      </div>

      {trend && (
        <div className="flex items-center text-[8px] md:text-[11px] font-bold mt-2 md:mt-4">
          <span className={`${trendUp ? 'text-[#34a853]' : 'text-[#ea4335]'} flex items-center gap-1 whitespace-nowrap`}>
             {trendUp ? '▲' : '▼'} {trend}
          </span>
          <span className="text-[#9aa0a6] ml-1.5 md:ml-2 whitespace-nowrap hidden md:inline">전월 동기 대비</span>
        </div>
      )}
    </div>
  );
};
