"use client";

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, RefreshCw, DollarSign, Loader2, Users, User, Heart } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const CATEGORY_TABS = [
  { id: '자산종류', label: '자산 종류' },
  { id: '유동성', label: '유동성' },
  { id: '통화', label: '통화' },
  { id: '계좌성격', label: '계좌 성격' },
  { id: '위험성', label: '위험성' },
  { id: '섹터', label: '섹터' },
  { id: '주식종류', label: '주식 종류' },
  { id: '세부분류', label: '세부 분류' }
];

export default function Dashboard() {
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1350);
  const [isLoading, setIsLoading] = useState(true);

  // 새로운 필터 State
  const [ownerFilter, setOwnerFilter] = useState<'전체' | '나' | '와이프'>('전체');
  const [categoryFilter, setCategoryFilter] = useState<string>('자산종류');

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/assets');
      const json = await res.json();
      if(json.status === 'success') {
        setData(json.data);
        if(json.history) setHistoryData(json.history);
        if(json.exchangeRate) setExchangeRate(json.exchangeRate);
      }
    } catch (e) {
      console.error(e);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    if (currency === 'USD') {
      return `$${(value / exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return `₩${value.toLocaleString()}`;
  };

  // 통계 계산 (요약 카드용 글로벌 계산: KRW로 통합된 평가액 사용)
  const totalAssets = data.reduce((acc, item) => acc + (item.computedTotalValueKRW || 0), 0);
  const myAssets = data.filter(item => item['소유자']?.includes('나') || item['소유자']?.includes('감')).reduce((acc, item) => acc + (item.computedTotalValueKRW || 0), 0);
  const wifeAssets = data.filter(item => item['소유자']?.includes('아내') || item['소유자']?.includes('진')).reduce((acc, item) => acc + (item.computedTotalValueKRW || 0), 0);
  const totalProfit = data.reduce((acc, item) => acc + (item.computedProfitKRW || 0), 0);
  const totalPrincipal = data.reduce((acc, item) => acc + (item.computedPrincipalKRW || 0), 0);
  const totalProfitRate = totalPrincipal > 0 ? (totalProfit / totalPrincipal) * 100 : 0;

  // 테이블과 파이차트에 적용할 필터링된 배열 데이터
  const filteredData = data.filter(item => {
    if (ownerFilter === '전체') return true;
    if (ownerFilter === '나') return item['소유자']?.includes('나') || item['소유자']?.includes('감');
    if (ownerFilter === '와이프') return item['소유자']?.includes('아내') || item['소유자']?.includes('진');
    return true;
  });

  // 파이차트용 데이터 (선택된 categoryFilter 기준으로 전부 KRW 기준 합산)
  const pieDataMap = filteredData.reduce((acc, item) => {
    const type = item[categoryFilter] || '미분류';
    acc[type] = (acc[type] || 0) + (item.computedTotalValueKRW || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const pieData = Object.entries(pieDataMap)
    .filter(([name, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 현재 차트/표 영역 전체 자산의 총합
  const filteredTotalAssets = pieData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">감진 통합 자산 대시보드</h1>
            <div className="flex items-center mt-2 space-x-3 mb-1">
              <p className="text-slate-500">구글 스프레드시트 실시간 연동</p>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100 shadow-sm">
                적용된 실시간 환율 (1$ = {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}원)
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* 소유자 필터 토글 */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg shrink-0">
              <button 
                onClick={() => setOwnerFilter('전체')}
                className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-all ${ownerFilter === '전체' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users className="w-4 h-4 mr-2" /> 전체
              </button>
              <button 
                onClick={() => setOwnerFilter('나')}
                className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-all ${ownerFilter === '나' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <User className="w-4 h-4 mr-2" /> 감성
              </button>
              <button 
                onClick={() => setOwnerFilter('와이프')}
                className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-all ${ownerFilter === '와이프' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Heart className="w-4 h-4 mr-2" /> 진
              </button>
            </div>

            <button 
              onClick={() => setCurrency(currency === 'KRW' ? 'USD' : 'KRW')}
              className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors shrink-0"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              {currency === 'KRW' ? 'USD' : 'KRW'}
            </button>
            
            <button 
              onClick={fetchData}
              disabled={isRefreshing}
              className={`p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all disabled:opacity-50 shrink-0`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <span className="ml-3 text-lg font-medium text-slate-600">구글 시트 연동 중입니다...</span>
          </div>
        ) : (
          <>
            {/* Top Summary Cards (Fixed) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-500 font-medium">전체 순자산</h3>
                  <div className="p-2 bg-blue-50 rounded-lg"><Wallet className="w-5 h-5 text-blue-600" /></div>
                </div>
                <p className="text-3xl font-bold mt-4">{formatCurrency(totalAssets)}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-500 font-medium">👨 나의 자산 (감성)</h3>
                  <div className="p-2 bg-indigo-50 rounded-lg"><Wallet className="w-5 h-5 text-indigo-600" /></div>
                </div>
                <p className="text-3xl font-bold mt-4">{formatCurrency(myAssets)}</p>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(myAssets/totalAssets || 0)*100}%`}}></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-500 font-medium">👩 와이프 자산 (진)</h3>
                  <div className="p-2 bg-rose-50 rounded-lg"><Wallet className="w-5 h-5 text-rose-600" /></div>
                </div>
                <p className="text-3xl font-bold mt-4">{formatCurrency(wifeAssets)}</p>
                 <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${(wifeAssets/totalAssets || 0)*100}%`}}></div>
                </div>
              </div>

              <div className={`p-6 rounded-2xl shadow-md text-white transition-shadow ${totalProfitRate >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-700 hover:shadow-emerald-500/20' : 'bg-gradient-to-br from-rose-500 to-red-700 hover:shadow-rose-500/20'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-white/80 font-medium">전체 합산 수익률</h3>
                  <div className="p-2 bg-white/20 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
                </div>
                <p className="text-3xl font-bold mt-4">{totalProfitRate > 0 ? '+' : ''}{totalProfitRate.toFixed(2)}%</p>
                <p className="text-sm text-white/80 mt-2">수익금: {formatCurrency(totalProfit)}</p>
              </div>
            </div>

            {/* 분류 탭 Pill 버튼들 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 overflow-x-auto flex space-x-2 scrollbar-hide shrink-0">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shrink-0 ${
                    categoryFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Middle Section: Chart & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">
                    {CATEGORY_TABS.find(t => t.id === categoryFilter)?.label || '분류'} 구성비
                  </h3>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${ownerFilter === '전체' ? 'bg-slate-100 text-slate-500' : (ownerFilter === '나' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700')}`}>
                    대상: {ownerFilter === '전체' ? '전체' : (ownerFilter === '나' ? '감성' : '진')}
                  </span>
                </div>
                
                <div className="h-[320px]">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)} 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">데이터가 없습니다</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">종목별 상세 현황</h3>
                  <span className="text-sm text-slate-500 font-medium">총 {filteredData.length}건 ({formatCurrency(filteredTotalAssets)})</span>
                </div>
                <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-200 text-sm text-slate-500">
                        <th className="pb-3 pt-2 font-medium">자산명 (티커)</th>
                        <th className="pb-3 pt-2 font-medium">
                          {CATEGORY_TABS.find(t => t.id === categoryFilter)?.label || '분류'}
                        </th>
                        <th className="pb-3 pt-2 font-medium text-right">현재가</th>
                        <th className="pb-3 pt-2 font-medium text-right">평가금액</th>
                        <th className="pb-3 pt-2 font-medium text-right">수익률</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredData.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-semibold text-slate-900">
                            {item['자산명']}
                            {item['티커/코드'] ? <span className="text-xs text-slate-400 font-normal ml-2">({item['티커/코드']})</span> : null}
                          </td>
                          <td className="py-3 text-slate-600">
                            <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-medium">
                              {item[categoryFilter] || '미분류'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-medium">
                            {item['통화']?.toUpperCase().includes('USD') ? '$' : '₩'}
                            {item.computedCurrentPrice ? item.computedCurrentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="py-3 text-right font-medium text-slate-900">
                            {formatCurrency(item.computedTotalValueKRW || 0)}
                          </td>
                          <td className="py-3 text-right font-semibold">
                            {item.computedProfitRate !== 0 ? (
                              <span className={item.computedProfitRate > 0 ? 'text-rose-500' : 'text-blue-500'}>
                                {item.computedProfitRate > 0 ? '+' : ''}{item.computedProfitRate.toFixed(2)}%
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Section: History Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">자산 증감 추이</h3>
              <div className="h-[300px] w-full">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="날짜" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b'}}
                        tickFormatter={(value) => `${value / 1000000}M`}
                        dx={-10}
                      />
                      <Tooltip 
                        formatter={(value: number) => `₩${value.toLocaleString()}`}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        labelStyle={{fontWeight: 'bold', color: '#334155', marginBottom: '4px'}}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="총자산" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">데이터가 없습니다</div>
                )}
              </div>
            </div>

          </>
        )}

      </div>
    </div>
  );
}
