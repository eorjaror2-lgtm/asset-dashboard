"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Loader2 } from 'lucide-react';

const TARGET_AMOUNT = 2000000000; // 20억

interface AssetItem {
  '자산종류'?: string;
  '자산명'?: string;
  '티커/코드'?: string;
  '통화'?: string;
  '소유자'?: string;
  computedCurrentPrice?: number;
  computedTotalValue?: number;
  computedTotalValueKRW?: number;
  computedProfit?: number;
  computedProfitKRW?: number;
  computedPrincipalKRW?: number;
  computedProfitRate?: number;
  [key: string]: any;
}

export default function Dashboard() {
  const [data, setData] = useState<AssetItem[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/assets');
      const json = await res.json();
      if(json.status === 'success') {
        setData(json.data);
        if(json.history) setHistoryData(json.history);
      }
    } catch (e) {
      console.error(e);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 지표 계산
  const totalAssets = data.reduce((acc, item) => acc + (item.computedTotalValueKRW || 0), 0);
  const totalProfit = data.reduce((acc, item) => acc + (item.computedProfitKRW || 0), 0);
  const totalPrincipal = data.reduce((acc, item) => acc + (item.computedPrincipalKRW || 0), 0);
  const totalProfitRate = totalPrincipal > 0 ? (totalProfit / totalPrincipal) * 100 : 0;
  
  const remainingTarget = TARGET_AMOUNT - totalAssets;
  const targetAchievedPercent = (totalAssets / TARGET_AMOUNT) * 100;

  // 카테고리 구성 (순자산 구성 바 용도)
  const categoryTotalMap = data.reduce((acc, item) => {
    const type = item['자산종류'] || '미분류';
    acc[type] = (acc[type] || 0) + (item.computedTotalValueKRW || 0);
    return acc;
  }, {} as Record<string, number>);

  const categoryArray = Object.entries(categoryTotalMap)
    .filter(([_, val]) => val > 0)
    .map(([name, val]) => ({ name, value: val, percent: (val / totalAssets) * 100 }))
    .sort((a, b) => b.value - a.value);

  // TOP 5 수익금 (임시로 전월 증감 스펙을 대체)
  const sortedByProfit = [...data].filter(d => (d.computedPrincipalKRW || 0) > 0);
  const topIncreases = [...sortedByProfit].sort((a, b) => (b.computedProfitKRW || 0) - (a.computedProfitKRW || 0)).slice(0, 5);
  const topDecreases = [...sortedByProfit].sort((a, b) => (a.computedProfitKRW || 0) - (b.computedProfitKRW || 0)).slice(0, 5);

  const formatNumber = (val: number) => Math.round(val).toLocaleString();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 p-4 md:p-10 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* 1. 헤더 */}
        <div className="flex justify-between items-end border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">목표는 동반퇴사 자산 대시보드</h1>
            <p className="text-sm font-medium text-slate-400">월 1회 입력 - 항목별 증감/증감률 자동</p>
          </div>
          <p className="text-xs font-semibold text-slate-300">Sheets → Web</p>
        </div>

        {/* 2. 월 선택 컨트롤 */}
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-bold text-slate-700">현재 기준</span>
          <select className="border border-slate-200 bg-white text-sm font-semibold text-slate-700 px-4 py-2 rounded shadow-sm outline-none">
            <option>Latest</option>
          </select>
        </div>

        {/* 3. 상단 5구 KPI 박스 (부채 제거 요건 반영) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border border-slate-100 bg-[#fbfcfc] rounded-xl p-5 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-bold text-slate-400 mb-4">순자산</span>
            <div className="flex items-baseline justify-end space-x-1">
              <span className="text-2xl md:text-3xl font-bold">{formatNumber(totalAssets)}</span>
              <span className="text-base font-bold">원</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">전체 평가금액 합산</span>
          </div>

          <div className="border border-slate-100 bg-[#fbfcfc] rounded-xl p-5 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-bold text-slate-400 mb-4">투자 원금</span>
            <div className="flex items-baseline justify-end space-x-1">
              <span className="text-2xl md:text-3xl font-bold">{formatNumber(totalPrincipal)}</span>
              <span className="text-base font-bold">원</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">평단가가 존재하는 자산</span>
          </div>

          <div className="border border-slate-100 bg-[#fbfcfc] rounded-xl p-5 flex flex-col justify-between shadow-sm">
             <span className="text-xs font-bold text-slate-400 mb-4">총 수익금</span>
            <div className="flex items-baseline justify-end space-x-1">
              <span className="text-2xl md:text-3xl font-bold">{formatNumber(totalProfit)}</span>
              <span className="text-base font-bold">원</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">현금, 예적금 외 변동수익</span>
          </div>

          <div className="border border-slate-100 bg-[#fbfcfc] rounded-xl p-5 flex flex-col justify-between shadow-sm">
             <span className="text-xs font-bold text-slate-400 mb-4">총 수익률</span>
            <div className="flex items-baseline justify-end space-x-1">
              <span className="text-2xl md:text-3xl font-bold">{totalProfitRate.toFixed(2)}</span>
              <span className="text-base font-bold">%</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">원금 대비 수익 비율</span>
          </div>
          
          <div className="border border-slate-100 bg-[#fbfcfc] rounded-xl p-5 flex flex-col justify-between shadow-sm">
             <span className="text-xs font-bold text-slate-400 mb-4">동반퇴사(20억)까지</span>
            <div className="flex items-baseline justify-end space-x-1">
              <span className="text-2xl md:text-3xl font-bold">{formatNumber(remainingTarget > 0 ? remainingTarget : 0)}</span>
              <span className="text-base font-bold">원</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">목표 달성률 {targetAchievedPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* 4. 순자산 추이 차트 */}
        <div className="border border-slate-100 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4 mb-8">
            <h3 className="text-sm font-extrabold text-slate-800">순자산 추이</h3>
            <div className="flex text-xs space-x-3 text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-full">
              <span>목표 대비 <span className="text-slate-800">{targetAchievedPercent.toFixed(1)}%</span></span>
              <span>남은 액 <span className="text-slate-800">{formatNumber(remainingTarget > 0 ? remainingTarget : 0)}원</span></span>
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="날짜" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis 
                    domain={[0, TARGET_AMOUNT * 1.1]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                    tickFormatter={(value) => `${(value / 100000000).toFixed(0)}억`}
                    dx={-10}
                  />
                  <ReferenceLine y={TARGET_AMOUNT} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: '목표 20억', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                  <Tooltip 
                    formatter={(value: number) => [`${formatNumber(value)}원`, '순자산']}
                    contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 'bold'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="총자산" 
                    stroke="#334155" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#334155', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6, fill: '#0f172a', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300 text-sm font-semibold">데이터가 없습니다</div>
            )}
          </div>
        </div>

        {/* 5. 순자산 구성 CSS Bar */}
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-black text-slate-800">순자산 구성</h3>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">카테고리별 자산 비중</p>
          </div>
          
          <div className="w-full h-32 flex rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            {categoryArray.map((cat, idx) => {
              // 그레이스케일 계조 (비중 순으로 진한 회색 -> 옅은 회색)
              const grays = ['bg-slate-400', 'bg-slate-300', 'bg-slate-200', 'bg-slate-100', 'bg-slate-50', 'bg-slate-800'];
              return (
                <div 
                  key={cat.name} 
                  style={{ width: `${cat.percent}%` }}
                  className={`${grays[idx % grays.length]} h-full border-r border-white flex flex-col items-center justify-center transition-all hover:opacity-80 p-1`}
                >
                  {cat.percent >= 5 && (
                    <>
                      <span className="text-xs font-bold text-slate-800 text-center">{cat.name}</span>
                      <span className="text-[10px] font-bold text-slate-600">{cat.percent.toFixed(0)}%</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. 증가 / 감소 TOP 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
          
          {/* 증가 TOP 5 */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800">수익 증가 TOP 5</h3>
              <span className="text-[10px] font-semibold text-slate-400">수익금 기준</span>
            </div>
            <div className="space-y-4">
              {topIncreases.map((item, idx) => {
                const profit = item.computedProfitKRW || 0;
                if (profit <= 0) return null;
                // max bar width calculation
                const maxProfit = topIncreases[0]?.computedProfitKRW || 1;
                const widthPercent = (profit / maxProfit) * 100;
                
                return (
                  <div key={idx} className="flex items-center text-xs font-bold text-slate-700">
                    <div className="w-32 truncate pr-4">{item['자산명']}</div>
                    <div className="flex-1 bg-slate-50 h-3 rounded-full overflow-hidden relative mr-4">
                      <div className="absolute top-0 left-0 bg-red-600 h-full rounded-full" style={{ width: `${widthPercent}%`}}></div>
                    </div>
                    <div className="w-24 text-right text-red-600">+{formatNumber(profit)}원</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 감소 TOP 5 */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800">수익 감소 TOP 5</h3>
              <span className="text-[10px] font-semibold text-slate-400">수익금 기준</span>
            </div>
            <div className="space-y-4">
              {topDecreases.map((item, idx) => {
                const profit = item.computedProfitKRW || 0;
                if (profit >= 0) return null;
                
                const minProfit = topDecreases[0]?.computedProfitKRW || -1;
                const widthPercent = (profit / minProfit) * 100;

                return (
                  <div key={idx} className="flex items-center text-xs font-bold text-slate-700">
                    <div className="w-32 truncate pr-4">{item['자산명']}</div>
                    <div className="flex-1 bg-slate-50 h-3 rounded-full overflow-hidden relative mr-4">
                      <div className="absolute top-0 left-0 bg-blue-600 h-full rounded-full" style={{ width: `${widthPercent}%`}}></div>
                    </div>
                    <div className="w-24 text-right text-blue-600">{formatNumber(profit)}원</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 7. 상세 표 */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mt-12 bg-white">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800">항목별 상세</h3>
            <span className="text-[10px] font-semibold text-slate-400">전체 포트폴리오</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold">항목명</th>
                  <th className="p-4 font-bold">분류</th>
                  <th className="p-4 font-bold text-right">투자원금(원)</th>
                  <th className="p-4 font-bold text-right">현재 평가액(원)</th>
                  <th className="p-4 font-bold text-right">수익금(원)</th>
                  <th className="p-4 font-bold text-right">수익률(%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold">{item['자산명']} <span className="text-[10px] text-slate-400 font-normal ml-1">{item['티커/코드']}</span></td>
                    <td className="p-4 font-semibold text-slate-500">{item['자산종류']}</td>
                    <td className="p-4 font-semibold text-slate-600 text-right">{formatNumber(item.computedPrincipalKRW || 0)}</td>
                    <td className="p-4 font-bold text-slate-800 text-right">{formatNumber(item.computedTotalValueKRW || 0)}</td>
                    <td className={`p-4 font-bold text-right ${(item.computedProfitKRW || 0) > 0 ? 'text-red-500' : (item.computedProfitKRW || 0) < 0 ? 'text-blue-500' : 'text-slate-500'}`}>
                      {(item.computedProfitKRW || 0) > 0 ? '+' : ''}{formatNumber(item.computedProfitKRW || 0)}
                    </td>
                    <td className={`p-4 font-bold text-right ${(item.computedProfitRate || 0) > 0 ? 'text-red-500' : (item.computedProfitRate || 0) < 0 ? 'text-blue-500' : 'text-slate-500'}`}>
                      {(item.computedProfitRate || 0) > 0 ? '+' : ''}{(item.computedProfitRate || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
