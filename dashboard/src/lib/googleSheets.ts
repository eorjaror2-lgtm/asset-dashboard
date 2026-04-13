import { GoogleSpreadsheet } from 'google-spreadsheet';
import fs from 'fs';
import path from 'path';

// docs 하위의 인증 정보 경로
const CREDENTIALS_PATH = path.join(process.cwd(), '../docs/client_secret_936349152786-97k38adgvafrh42h1ehtrquqapevched.apps.googleusercontent.com.json');
const TOKEN_PATH = path.join(process.cwd(), '../docs/token.json');

export async function getSpreadsheet(sheetId: string) {
  let credentialsStr = process.env.GOOGLE_CREDENTIALS;
  let tokenStr = process.env.GOOGLE_TOKEN;

  // Vercel 환경 변수가 지정되어 있지 않다면 로컬 파일에서 읽기 시도
  if (!credentialsStr || !tokenStr) {
    if (!fs.existsSync(CREDENTIALS_PATH) || !fs.existsSync(TOKEN_PATH)) {
      throw new Error('Google OAuth 인증 수단이 부족합니다. (환경 변수 또는 로컬 파일 없음)');
    }
    credentialsStr = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    tokenStr = fs.readFileSync(TOKEN_PATH, 'utf-8');
  }

  const credentials = JSON.parse(credentialsStr);
  const token = JSON.parse(tokenStr);

  const client_id = credentials.installed?.client_id || credentials.web?.client_id;
  const client_secret = credentials.installed?.client_secret || credentials.web?.client_secret;

  // 구글 시트 객체 및 auth 생성
  const { OAuth2Client } = require('google-auth-library');
  const auth = new OAuth2Client(client_id, client_secret);

  // token.json 에서 읽은 정보로 토큰 세팅
  auth.setCredentials({
      access_token: token.token,
      refresh_token: token.refresh_token,
      expiry_date: token.expiry ? new Date(token.expiry).getTime() : undefined,
  });

  const doc = new GoogleSpreadsheet(sheetId, auth);

  // 메타데이터 로드
  await doc.loadInfo();
  return doc;
}
