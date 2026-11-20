# 잇:다 (eat 多)

식이 제한이 있는 서울대학교 구성원이 학내 비학식당의 메뉴별 식재료 정보를 확인할 수 있도록 돕는 웹앱

## 처음 작업을 맡으면

AI 코딩 도구에서 이 저장소 폴더를 열고 아래 한 문장에 맡은 일만 넣어 보내세요.

> 팀 규칙대로 [맡은 일] 작업해 줘.

예: “팀 규칙대로 식당 및 메뉴 검색 작업해 줘.” AI가 [팀 작업 지침](AGENTS.md)에 따라 자료 확인, 작업 등록 확인, 구현, 검사, 셀프리뷰, PR 준비를 이어서 수행합니다. 팀원은 필요한 결정에 답하고 마지막에 결과를 직접 확인하면 됩니다. 준비가 필요한 첫 사용자는 [첫 작업 안내](docs/first-task.md)를 참고하세요. PR은 성은영(`@Eun-Y0ung`)의 승인 후 병합합니다.

## 프로젝트 자료

- [팀 Google Drive](https://drive.google.com/drive/folders/161wj4bWoihZ3NlYlhuZxB8xf_3R2SZ_g) — 프로젝트 공유 자료를 찾는 시작 위치입니다.
- [설계 자료 폴더](https://drive.google.com/drive/folders/1dQFtCVjYneL9wQ7B_lJL9zVF24d1OhKj) — PRD와 기능정의서를 확인합니다.
- [Figma 와이어프레임](https://www.figma.com/design/TWl3V8WqKMYTOxBvd6qusY/%EB%A7%90%EB%B9%9B-%EC%99%80%EC%9D%B4%EC%96%B4%ED%94%84%EB%A0%88%EC%9E%84?node-id=0-1) — 화면 작업 시 관련 화면과 흐름을 확인합니다.

자료를 읽으려면 각 서비스의 접근 권한과 AI 도구의 연결이 필요할 수 있습니다. 와이어프레임에 표시된 모든 화면이 이번 작업 범위에 포함되는 것은 아닙니다.

## 팀 문서

- [서비스 범위](docs/requirements.md)
- [식재료·필터·제보 정책](docs/data-policy.md)
- [작업 목록](docs/tasks.md)
- [검증 기준](docs/checklist.md)
- [개발 범위와 품질 규칙](docs/development.md)
- [실수와 재발 방지 기록](docs/mistakes.md)
- [첫 작업 안내](docs/first-task.md)
- [작업 카드 양식](docs/task-card-template.md)
- [기여 방법](AGENTS.md)

## 개발 환경

기획상 프론트엔드는 React와 JavaScript, 지도는 NAVER Maps API, 백엔드는 Supabase, 배포는 Vercel을 사용합니다. 현재 브랜치에는 앱 코드가 없습니다. 개발 환경이 정해지면 실제 설치·실행 명령, 필요한 환경변수 이름, 화면 확인 방법을 여기에 추가합니다.
