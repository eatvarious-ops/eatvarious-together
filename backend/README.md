# 제보 데이터와 운영진 검토

Node.js 24에서 이 디렉터리의 `npm ci`와 `npm test`를 실행한다. PGlite에 테스트용 auth·storage 테이블과 역할을 구성해 마이그레이션의 재실행, 익명·회원·운영진 권한, 중복 제보, 부분 승인, 상충 정보와 실패 후 재시도를 검사한다.

Supabase 개발 프로젝트에서는 `setup.sql`을 사용한다. 앱은 아이디·비밀번호 로그인과 비공개 evidence 버킷을 사용한다. 운영진 권한은 신뢰된 관리자만 app_metadata.role에 admin을 지정해 부여한다. 개발 프로젝트와 운영 프로젝트의 데이터·키를 분리한다. 로컬 검사는 외부 프로젝트에 접속하지 않는다.

## 학생 가입 함수

새 프로젝트는 Supabase Auth의 Email 제공자를 활성화하고 `setup.sql`과 `signup-limit.sql`을 적용한다. 후자는 가입 횟수를 세는 서버 전용 함수다. 기존 프로젝트에서 다시 실행해도 계정과 제보가 보존된다. 이 디렉터리에서 Supabase CLI로 `supabase functions deploy itda-student-signup --project-ref <프로젝트-ref>`를 실행한다. 서버는 Supabase가 제공하는 환경 변수로 Auth 사용자를 생성한다.

가입 요청은 로그인 전에 호출되므로 함수 설정에서 JWT 검사를 끈다. 함수가 아이디 형식·예약어·가입 빈도를 확인하고 서버에서 학생 역할을 지정한다. 동일 아이디를 소문자로 정규화한 내부 이메일 주소에 매핑하며 Supabase Auth의 고유 제약이 중복 가입을 막는다. 운영진 계정은 별도로 관리한다.

## 운영진 일괄 등록 함수 (INP-10~12)

운영진 등록은 새 테이블이나 권한을 만들지 않는다. 운영진 계정이 일반 제보와 같은 `reports`를 넣고 곧바로 `review_report`로 승인한다. 그래서 학내 범위·50m 중복·같은 메뉴명·확인 방법 검증이 그대로 적용되고, 제보 기록에 작성자와 처리자가 함께 남는다. 공식 자료 링크 같은 근거는 제보의 `memo`에 남긴다.

함수 두 개는 호출자의 로그인 토큰을 Supabase Auth로 확인해 `app_metadata.role`이 `admin`일 때만 동작한다. 아무것도 저장하지 않고 후보만 돌려준다.

| 함수 | 입력 → 출력 | 필요한 비밀값 |
| --- | --- | --- |
| `itda-place-search` | `{query}` → 학내 범위 안의 후보 `{ko,address,phone,category,lat,lng}` 최대 5개와 제외된 개수. 검색어에 '서울대'가 없으면 앞에 붙인다. | `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` (NAVER Cloud API HUB 지역 검색). 다른 주소를 쓰려면 `NAVER_SEARCH_ENDPOINT` |
| `itda-menu-extract` | `{images:[{mediaType,data(base64)}]}` 최대 5장·장당 5MB → 사진에 인쇄된 메뉴명 `{ko,en}`과 원산지·알레르기 표시 `{ingredient,menus,text}` | `ANTHROPIC_API_KEY`. 모델은 `ITDA_MENU_MODEL`로 바꿀 수 있다 |

메뉴 추출은 인쇄된 글자만 읽고, 메뉴명이나 음식 사진으로 식재료를 추측하지 않도록 지시한다. 표시 결과는 운영진 화면에서 '포함' 제안으로만 쓰며 저장 전에 운영진이 확인한다.

배포: 비밀값을 `supabase secrets set NAVER_SEARCH_CLIENT_ID=… NAVER_SEARCH_CLIENT_SECRET=… ANTHROPIC_API_KEY=… --project-ref <프로젝트-ref>`로 넣고 `supabase functions deploy itda-place-search` 와 `supabase functions deploy itda-menu-extract`를 실행한다. 비밀값이 없으면 각각 `search_not_configured`, `extract_not_configured`를 돌려준다. `npm test`의 `tests/admin-intake.mjs`는 외부 API를 흉내 낸 응답으로 권한·학내 필터·좌표 변환·출력 정리를 검사한다.
