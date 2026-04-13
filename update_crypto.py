import os
import json
import time
import pyupbit
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.exceptions import RefreshError

# === 설정 부분 ===
SPREADSHEET_ID = '1saXeXTGMGDvVF5upx5KP2GuW6bSwgw6XC9L_c5b3X0Q'
TOKEN_FILE = os.path.join(os.path.dirname(__file__), 'docs', 'token.json')
# =================

def main():
    if not os.path.exists(TOKEN_FILE):
        print(f"오류: {TOKEN_FILE} 파일을 찾을 수 없습니다.")
        return

    print("🔑 구글 시트 인증 중...")
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, ['https://www.googleapis.com/auth/spreadsheets'])
    
    try:
        service = build('sheets', 'v4', credentials=creds)
        sheet_api = service.spreadsheets()

        # 1. 시트 이름 동적 확인 (첫 번째 시트)
        sheet_metadata = sheet_api.get(spreadsheetId=SPREADSHEET_ID).execute()
        first_sheet_name = sheet_metadata.get('sheets', [])[0].get('properties', {}).get('title', 'Sheet1')
        read_range = f"'{first_sheet_name}'!A:Z"

        print(f"📄 '{first_sheet_name}' 시트 데이터 불러오는 중...")
        result = sheet_api.values().get(spreadsheetId=SPREADSHEET_ID, range=read_range).execute()
        rows = result.get('values', [])
        
        if not rows:
            print("데이터가 없습니다.")
            return

        headers = rows[0]
        
        # 열 인덱스 찾기 함수
        def get_col_index(possible_names):
            for i, h in enumerate(headers):
                if any(name in h for name in possible_names):
                    return i
            return -1

        idx_exchange = get_col_index(['기관/거래소', '기관', '거래소'])
        idx_ticker = get_col_index(['티커', '코드'])
        idx_avg_price = get_col_index(['평균단가', '평단가'])
        idx_quantity = get_col_index(['보유수량', '수량'])
        idx_current = get_col_index(['현재가'])
        idx_total = get_col_index(['평가금액', '금액'])
        idx_profit = get_col_index(['수익률'])

        if -1 in [idx_exchange, idx_ticker, idx_avg_price, idx_quantity, idx_current, idx_total, idx_profit]:
            print("❌ 시트에서 필수 열 헤더를 모두 찾지 못했습니다. 헤더 이름을 확인해주세요.")
            print(f"발견된 인덱스 - 기관:{idx_exchange}, 티커:{idx_ticker}, 평단가:{idx_avg_price}, 수량:{idx_quantity}, 현재가:{idx_current}, 평가금액:{idx_total}, 수익률:{idx_profit}")
            return

        updates = []
        print("\n🔍 업비트 데이터 분석 및 실시간 가격 조회 중...")

        for row_idx, row in enumerate(rows):
            if row_idx == 0: continue # 헤더 건너뛰기
            
            # 열 개수가 부족할 수 있으므로 안전하게 패딩
            row += [''] * (max(idx_exchange, idx_ticker, idx_avg_price, idx_quantity, idx_current, idx_total, idx_profit) + 1 - len(row))
            
            exchange = row[idx_exchange]
            if '업비트' in exchange:
                ticker = row[idx_ticker].strip()
                if not ticker:
                    continue
                
                # 티커 포맷 교정 (예: BTC -> KRW-BTC)
                if '-' not in ticker:
                    ticker = f"KRW-{ticker}"
                
                try:
                    current_price = pyupbit.get_current_price(ticker)
                    if current_price is None or current_price == 0:
                        print(f"⚠️ {ticker} 현재가를 가져오지 못했습니다. 티커를 확인해주세요.")
                        continue
                    
                    # 수치 변환
                    try:
                        avg_price = float(str(row[idx_avg_price]).replace(',', '')) if row[idx_avg_price] else 0
                        quantity = float(str(row[idx_quantity]).replace(',', '')) if row[idx_quantity] else 0
                    except ValueError:
                        print(f"⚠️ {ticker} 의 평단가 또는 수량이 숫자가 아닙니다.")
                        continue
                    
                    # 계산
                    total_value = current_price * quantity
                    profit_rate = ((current_price - avg_price) / avg_price * 100) if avg_price > 0 else 0

                    print(f"✅ {ticker} 업데이트 준비 -> 현재가: {current_price:,.0f}원, 평가금액: {total_value:,.0f}원, 수익률: {profit_rate:.2f}%")

                    # 구글 시트 업데이트용 배치 데이터 생성
                    # row_idx는 0부터 시작하므로 A1 표기법에서는 row_idx + 1
                    sheet_row_num = row_idx + 1
                    
                    # 현재가 업데이트
                    updates.append({
                        "range": f"'{first_sheet_name}'!{chr(65+idx_current)}{sheet_row_num}",
                        "values": [[current_price]]
                    })
                    # 평가금액 업데이트
                    updates.append({
                        "range": f"'{first_sheet_name}'!{chr(65+idx_total)}{sheet_row_num}",
                        "values": [[total_value]]
                    })
                    # 수익률 업데이트
                    updates.append({
                        "range": f"'{first_sheet_name}'!{chr(65+idx_profit)}{sheet_row_num}",
                        "values": [[profit_rate]] # 구글시트 퍼센트 서식이면 /100 해야 할 수도 있음. 사용자가 100을 곱해달라고 했으므로 그대로 둠
                    })

                except Exception as e:
                    print(f"에러 발생 ({ticker}): {e}")

        if not updates:
            print("\n업데이트할 업비트 항목이 없습니다.")
            return

        print("\n🚀 구글 시트 일괄 업데이트 진행 중...")
        body = {
            "valueInputOption": "USER_ENTERED",
            "data": updates
        }
        sheet_api.values().batchUpdate(spreadsheetId=SPREADSHEET_ID, body=body).execute()
        print(f"🎉 성공적으로 {len(updates)//3}개의 업비트 자산 정보를 업데이트했습니다!")

    except RefreshError:
        print("❌ 인증 토큰이 만료되었습니다. docs/setup_auth.py 를 다시 실행하여 구글 인증을 갱신해주세요.")
    except Exception as e:
        print(f"❌ 에러가 발생했습니다: {e}")

if __name__ == "__main__":
    main()
