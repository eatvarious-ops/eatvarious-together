# 잇다.html 미리보기

팀원이 설치 없이 화면을 확인하기 위한 체험용 빌드 파일이다. 코드 원본이 아니며 앱 코드가 바뀌면 다시 빌드해 교체한다.

- 출처: `feat/6-real-campus-map` 브랜치 `29f1e86` (2026-11-20 14:53) — 아직 main에 병합되지 않은 코드
- 생성: `frontend/`에서 `npm ci` 후 `ITDA_NAVER_CLIENT_ID=… npm run build`, 결과 `frontend/dist/index.html`을 복사
- 포함된 설정: NAVER Maps 공개 Client ID(브라우저에 노출되는 공개값). Supabase 설정과 비밀값은 넣지 않았다.
- 체험 모드: 가상 식당 6곳·메뉴 14개, 체험 계정, 브라우저 저장소 사용. 실제 로그인·DB는 연결되지 않는다.

## 보는 방법

- 파일을 내려받아 바로 열면 내장 캠퍼스 약도(OpenStreetMap)로 표시된다. 이 약도에는 건물 이름이 없다.
- NAVER 지도(건물 이름 포함)는 NAVER Cloud에 등록된 주소에서 열 때만 표시된다. 현재 등록 주소는 `http://127.0.0.1:4173`, `http://localhost:4173`이다. 이 파일이 있는 폴더에서 `python -m http.server 4173 --bind 127.0.0.1`을 실행하고 `http://127.0.0.1:4173/잇다.html`을 연다.
