# 캠퍼스 식당 웹앱

Node.js 24에서 이 디렉터리의 `npm ci`, `npm test`, `npm start`를 차례로 실행한다. 테스트는 먼저 프로덕션 HTML을 빌드한다. http://127.0.0.1:4173 을 열거나 생성된 `dist/index.html`을 Chrome에서 연다. 빌드만 하려면 `npm run build`를 사용한다.

기본 체험 모드는 가상 식당 6곳과 메뉴 14개, 관악캠퍼스 실제 지도를 사용한다. 식당에서 메뉴를 열어 7개 재료 상태를 보고 학생으로 추가 제보한다. 운영진 체험 계정에서 승인·반려하고, 공개 메뉴와 학생의 내 제보에서 결과를 확인한다. 사진 출처는 src/seed.js에 기록했다. 체험 데이터는 실제 식사 판단에 사용하지 않는다.

개발 서비스에 연결하려면 빌드 환경에 ITDA_SUPABASE_URL과 ITDA_SUPABASE_PUBLIC_KEY를 함께 지정한다. Google OAuth 리디렉션 주소에 로컬 주소를 등록한다.

## 지도 연결

- 키가 없는 웹 실행에서는 Leaflet이 표준 OpenStreetMap 온라인 타일을 불러온다. 지도 하단에 현재 표시 중인 데이터의 출처가 나온다.
- 내려받은 HTML을 직접 열거나 타일 요청이 실패하면 포함된 캠퍼스 지도로 탐색할 수 있다. 이 지도에는 OpenStreetMap에서 추출한 실제 도로·건물·보행로가 들어 있다. 예시 식당의 이름과 좌표는 가상 데이터다.
- 서비스에 NAVER 지도를 적용하려면 NAVER Cloud 콘솔의 Maps에서 애플리케이션을 등록하고 Dynamic Map을 선택한다. Web 서비스 URL에는 브라우저에서 사용할 주소를 등록한다. 로컬 확인 주소는 `http://127.0.0.1:4173`이다. 호스팅 시 사용할 도메인도 등록한다.
- 팀 NAVER Maps 공개 Client ID(`vhkb2gac8j`)가 `build.mjs`에 기본값으로 들어 있어 `npm run build`만 해도 NAVER 지도가 적용된다. 허용 주소는 `http://127.0.0.1:4173`, `http://localhost:4173`이며 배포 도메인은 콘솔에서 추가한다. 다른 Client ID는 `ITDA_NAVER_CLIENT_ID`로 덮어쓰고, `node build.mjs --no-naver`는 키 없이 빌드한다(`npm test`가 오프라인 대체 지도 검사에 사용). Client Secret은 사용하지 않는다. [NAVER 공식 시작 안내](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)

### 오프라인 데이터 출처

© OpenStreetMap contributors. SVG는 2026-11-20에 내려받은 [관악캠퍼스 주변 OSM 원본](https://api.openstreetmap.org/api/0.6/map?bbox=126.918,37.440,126.990,37.480)에서 EPSG:3857로 투영한 도로·건물·수계·녹지 도형이다. [Open Database License와 저작자 표시](https://www.openstreetmap.org/copyright)

같은 범위의 XML 파일로 배경을 갱신하려면 `python3 scripts/campus_snapshot.py region.osm assets/gwanak-osm.svg`를 실행하고 빌드한다. 지도 이미지와 핀·등록용 좌표는 같은 Leaflet 투영을 사용한다. 온라인 타일은 사용자가 보는 영역만 요청한다. [표준 타일 사용 정책](https://operations.osmfoundation.org/policies/tiles/)
