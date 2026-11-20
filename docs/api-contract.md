# 웹앱의 데이터 연결

프론트엔드는 Supabase JS의 공개 클라이언트로 조회·제보하고, 백엔드는 PostgreSQL의 행 수준 보안과 검토 함수로 권한과 공개 반영을 제어한다. 아래 계약은 업로드한 구현의 검토 기준이다.

| 작업 | 요청 | 반환과 예외 |
| --- | --- | --- |
| 탐색 | restaurants, menus에서 hidden=false인 id, data 조회 | 식당·메뉴 배열. 메뉴의 data.rid가 식당을 가리킨다. 조회 실패 시 재시도 가능 |
| 제보 등록 | reports에 type, rid, mid, changes, method, memo, photo 제출 | Google 인증 필요. 서버가 사용자와 접수 시각·pending 상태를 기록. 중복·대상 누락·권한 오류는 공개 데이터를 바꾸지 않음 |
| 내 제보·검토함 | reports 조회 | 사용자에게 본인 기록, 운영진에게 전체 기록. 익명은 빈 목록 |
| 승인·반려 | review_report(p_id, p_approve, p_keys, p_reason) | 승인된 실제 항목을 approved_keys에 보존. approved, rejected 또는 failed. 이미 처리한 제보와 운영진 외 요청은 거부 |
| 사진 | 비공개 evidence 버킷에 사용자 UUID로 시작하는 경로로 업로드 | 소유자·운영진 접근. 공개된 식당·메뉴에서 참조하는 사진만 다른 사용자가 읽을 수 있음 |

메뉴 data.ingredients의 키는 pork, beef, chicken, other, seafood, egg, dairy다. 값은 yes, no, unknown이다. data.evidence는 항목별 확인 방법(staff, label, self)과 날짜를 보관한다. 선택한 태그는 같은 메뉴에서 모두 충족해야 한다.

빈 검색어로 돌아가는 화면, 학내 경계 좌표, 실패 표시와 부분 승인 후 남은 항목의 처리는 [데이터 정책](data-policy.md)의 미확정 경계를 따른다. 제출된 구현의 처리 방식을 검토한 뒤 팀이 확정한다.
