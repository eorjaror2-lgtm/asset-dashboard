import { NextResponse } from 'next/server';
import { getSpreadsheet } from '@/lib/googleSheets';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const SHEET_ID = '1saXeXTGMGDvVF5upx5KP2GuW6bSwgw6XC9L_c5b3X0Q';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await getSpreadsheet(SHEET_ID);
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    // 환율 조회 (한 번만 조회하여 재사용)
    let usdToKrw = 1350;
    try {
      const exRate = (await yahooFinance.quote('KRW=X')) as any;
      if (exRate && exRate.regularMarketPrice) {
        usdToKrw = exRate.regularMarketPrice;
      }
    } catch (e) {
      console.warn("환율 조회 실패, 기본값 사용:", e);
    }

    const updatedRows = [];
    let updatedCount = 0;

    for (const row of rows) {
      const r = row.toObject();
      let currentPriceNum = 0;
      let isUpdated = false;

      const ticker = r['티커/코드'];
      const assetType = r['자산종류']; // 주식, 코인 등 구분용

      try {
        if (ticker) {
          // 1. 코인인 경우 (업비트)
          if (assetType && assetType.includes('코인')) {
            const upbitRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${ticker}`);
            const upbitJson = await upbitRes.json();
            if (upbitJson && upbitJson.length > 0) {
              currentPriceNum = upbitJson[0].trade_price;
              isUpdated = true;
            }
          }
          // 2. 국내/해외 주식인 경우 (yfinance)
          else if (assetType && assetType.includes('주식')) {
            // yahoo-finance2는 국내주식 코드(005930)에 뒤에 .KS 또는 .KQ가 붙어야 함
            let finalTicker = ticker;
            // 코드가 숫자로만 이루어져 있다면 한국 주식으로 간주 (.KS 로 통일, 필요시 분기)
            if (/^\d+$/.test(ticker)) {
              finalTicker = `${ticker}.KS`; // 임시 매핑 (코스피)
            }
            const yfQuote = (await yahooFinance.quote(finalTicker)) as any;
            if (yfQuote && yfQuote.regularMarketPrice) {
              currentPriceNum = yfQuote.regularMarketPrice;
              isUpdated = true;
            }
          }
        }
      } catch (e) {
        console.warn(`[${r['자산명']}] 시세 업데이트 중 에러: `, e);
      }

      // '금액' 열을 파싱 (사용자 요청: 금액 항목이 현재 그 종목의 전체 평가금액임)
      const inputAmount = parseFloat(r['금액']?.replace(/,/g, '')) || 0;
      const quantity = parseFloat(r['수량']?.replace(/,/g, '')) || 1; // 수량 없으면 1
      const avgPrice = parseFloat(r['평단가']?.replace(/,/g, '')) || 0;

      let totalValue;
      let currentPriceToSave;

      if (isUpdated && currentPriceNum > 0) {
        // API로 현재가가 성공적으로 조회된 종목: 현재가 * 수량
        totalValue = currentPriceNum * quantity;
        currentPriceToSave = currentPriceNum;
      } else {
        // API 조회가 안되거나 티커가 없는 비상장/현금성 자산: '금액' 자체가 전체 평가금액
        totalValue = inputAmount;
        currentPriceToSave = quantity > 0 ? (inputAmount / quantity) : inputAmount;
      }

      const hasCostBasis = avgPrice > 0 && quantity > 0;
      const profit = hasCostBasis ? (currentPriceToSave - avgPrice) * quantity : 0;
      const profitRate = hasCostBasis ? ((currentPriceToSave - avgPrice) / avgPrice) * 100 : 0;
      const principal = hasCostBasis ? avgPrice * quantity : 0;

      const isUSD = String(r['통화'] || '').toUpperCase().includes('USD');

      // 환율이 적용된 원화 기준 평가금액
      const totalValueKRW = isUSD ? totalValue * usdToKrw : totalValue;
      const profitKRW = isUSD ? profit * usdToKrw : profit;
      const principalKRW = isUSD ? principal * usdToKrw : principal;

      // 계산된 값을 JSON 객체에 세팅하여 프론트로 전달 (시트 저장 안함)
      r.computedCurrentPrice = currentPriceToSave;
      r.computedTotalValue = totalValue; // 원래 통화 기준
      r.computedTotalValueKRW = totalValueKRW; // 원화 기준 총합용
      r.computedProfit = profit; // 원래 통화 기준
      r.computedProfitKRW = profitKRW; // 원화 기준 총합용
      r.computedPrincipalKRW = principalKRW;
      r.computedProfitRate = profitRate;
      r.usdToKrw = usdToKrw;

      if (isUpdated) updatedCount++;
      updatedRows.push(r);
    }

    // 통계 합산으로 히스토리 기록 (전부 KRW 기준 통합)
    const totalAssets = updatedRows.reduce((sum, item) => sum + (item.computedTotalValueKRW || 0), 0);
    const myAssets = updatedRows.filter(item => item['소유자']?.includes('나') || item['소유자']?.includes('감')).reduce((sum, item) => sum + (item.computedTotalValueKRW || 0), 0);
    const wifeAssets = updatedRows.filter(item => item['소유자']?.includes('아내') || item['소유자']?.includes('진')).reduce((sum, item) => sum + (item.computedTotalValueKRW || 0), 0);

    let historySheet = doc.sheetsByTitle['HISTORY'];

    if (totalAssets > 0) {
      if (!historySheet) {
        historySheet = await doc.addSheet({ title: 'HISTORY', headerValues: ['날짜', '총자산(감성)', '총자산(진)', '합계'] });
      }
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const historyRows = await historySheet.getRows();
      const lastRow = historyRows[historyRows.length - 1];

      const newData = { '날짜': today, '총자산(감성)': wifeAssets, '총자산(진)': myAssets, '합계': totalAssets };

      if (lastRow && lastRow.get('날짜') === today) {
        lastRow.assign(newData);
        await lastRow.save().catch(e => console.error("히스토리 업데이트 실패:", e));
      } else {
        await historySheet.addRow(newData).catch(e => console.error("히스토리 추가 실패:", e));
      }
    }

    let historyData: any[] = [];
    if (historySheet) {
      try {
        const historyRows = await historySheet.getRows();
        historyData = historyRows.map((r: any) => ({
          날짜: r.get('날짜'),
          총자산: parseFloat(r.get('합계')?.replace(/,/g, '') || 0)
        }));
      } catch (e) {
        console.error("HISTORY 읽기 에러: ", e);
      }
    }

    // 시트1(원본 데이터 시트)은 무거운 row.save() 없이 
    // 읽기 및 계산용으로만 사용 (오류/병목 완전히 방지됨)
    // - 사용자 요청으로 구글 시트 탭에 직접 현재가/수익률을 기록하지 않습니다.


    return NextResponse.json({
      status: 'success',
      exchangeRate: usdToKrw,
      data: updatedRows,
      history: historyData
    });

  } catch (error: any) {
    console.error("API GET 에러:", error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
