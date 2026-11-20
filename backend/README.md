# 제보 데이터와 운영진 검토

Node.js 24에서 이 디렉터리의 `npm ci`와 `npm test`를 실행한다. PGlite에 테스트용 auth·storage 테이블과 역할을 구성해 마이그레이션의 재실행, 익명·회원·운영진 권한, 중복 제보, 부분 승인, 상충 정보와 실패 후 재시도를 검사한다.

Supabase 개발 프로젝트에서는 `setup.sql`을 사용한다. 앱은 아이디·비밀번호 로그인과 비공개 evidence 버킷을 사용한다. 운영진 권한은 신뢰된 관리자만 app_metadata.role에 admin을 지정해 부여한다. 개발 프로젝트와 운영 프로젝트의 데이터·키를 분리한다. 로컬 검사는 외부 프로젝트에 접속하지 않는다.

## 학생 가입 함수

새 프로젝트는 Supabase Auth의 Email 제공자를 활성화하고 `setup.sql`과 `signup-limit.sql`을 적용한다. 후자는 가입 횟수를 세는 서버 전용 함수다. 기존 프로젝트에서 다시 실행해도 계정과 제보가 보존된다. 이 디렉터리에서 Supabase CLI로 `supabase functions deploy itda-student-signup --project-ref <프로젝트-ref>`를 실행한다. 서버는 Supabase가 제공하는 환경 변수로 Auth 사용자를 생성한다.

가입 요청은 로그인 전에 호출되므로 함수 설정에서 JWT 검사를 끈다. 함수가 아이디 형식·예약어·가입 빈도를 확인하고 서버에서 학생 역할을 지정한다. 동일 아이디를 소문자로 정규화한 내부 이메일 주소에 매핑하며 Supabase Auth의 고유 제약이 중복 가입을 막는다. 운영진 계정은 별도로 관리한다.
