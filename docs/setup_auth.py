import os
from google_auth_oauthlib.flow import InstalledAppFlow

# 파일들의 절대 경로 지정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(BASE_DIR, 'client_secret_936349152786-97k38adgvafrh42h1ehtrquqapevched.apps.googleusercontent.com.json')
TOKEN_FILE = os.path.join(BASE_DIR, 'token.json')

# 승인받을 권한(Scope) 설정
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def main():
    print("OAuth 2.0 데스크톱 앱 인증을 시작합니다...")
    # 시크릿 파일을 사용하여 플로우 객체 생성
    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
    
    # 로컬 웹서버를 열고 사용자의 구글 로그인을 기다림
    creds = flow.run_local_server(port=0)
    
    # 인증 성공 후 얻은 토큰을 JSON 형태로 저장
    with open(TOKEN_FILE, 'w') as token:
        token.write(creds.to_json())
    
    print("\n✅ 성공적으로 구글 시트 접근 권한을 얻었습니다!")
    print(f"✅ '{TOKEN_FILE}' 파일이 생성되었습니다. 이제 Next.js가 이 파일을 사용해 데이터를 읽고 씁니다.")

if __name__ == '__main__':
    main()
