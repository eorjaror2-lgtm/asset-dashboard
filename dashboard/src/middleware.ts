import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  // 환경 변수에서 설정된 아이디/비밀번호 가져오기
  const user = process.env.BASIC_AUTH_USER;
  const pwd = process.env.BASIC_AUTH_PASSWORD;

  // 환경 변수가 아예 설정되지 않은 상황(예: 로컬 개발 시 굳이 안했을 때 등)에는 통과시킬 수도 있지만,
  // 배포 시 보안을 위해 설정이 없으면 무조건 막는 것이 안전합니다.
  if (!user || !pwd) {
    // 만약 Vercel이 아닌 로컬(개발환경)이면 통과시키고 싶다면 아래 주석을 해제하세요.
    // if (process.env.NODE_ENV === 'development') return NextResponse.next();
    
    // 배포 환경인데 환경 변수 설정 안되어 있으면 안내 응답
    return new NextResponse('Authentication environment variables not set.', { status: 500 });
  }

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [providedUser, providedPwd] = atob(authValue).split(':');

    if (providedUser === user && providedPwd === pwd) {
      return NextResponse.next();
    }
  }

  // 인증 실패 또는 인증 헤더가 없는 경우
  url.pathname = '/api/auth';
  return new NextResponse('Auth Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Dashboard Area"',
    },
  });
}
