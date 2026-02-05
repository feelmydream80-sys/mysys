# 작업 진행 상황

## 완료된 작업
- [x] 현재 mngr_sett.js 파일 분석
- [x] 필요한 디렉토리 구조 생성
- [x] 공통 유틸리티 함수 분리 (utils.js, validators.js, formatters.js)
- [x] API 서비스 모듈 생성 (services/api.js)
- [x] 상태 관리 모듈 생성 (services/stateManager.js)
- [x] 탭별 모듈 생성 (tabs/statistics.js, tabs/userManagement.js, tabs/dataAccess.js)
- [x] mngr_sett.js 파일 수정 (핵심 로직만 남김)
- [x] 모듈 간 의존성 연결 확인 및 테스트
- [x] 통계 탭의 오늘 날짜 가져오기 문제 해결
- [x] Git 최신 태그 정보 가져오기
- [x] V1.16으로 버전 업데이트 및 커밋
- [x] 데이터정의 탭 UI 구현 (조회/추가/수정 기능)
- [x] tb_user_acs_log 변경 이력 기록 기능 구현
- [x] 그룹 추가 시 비활성화 그룹 확인 및 활성화 기능 구현
- [x] 삭제 그룹 검색 필터 추가
- [x] 소프트 삭제 SQL 쿼리 변경
- [x] Service 메서드 개선 - 그룹 삭제시 하위 데이터 비활성화
- [x] tb_con_mst ↔ tb_mngr_sett 자동 동기화 (애플리케이션 레벨)
- [x] CD900~CD999 및 100의 배수 제외 로직 추가 (애플리케이션 레벨)
- [x] 데이터 삭제 및 백업 기능 구현
- [x] 표시 옵션 구현: 코드+명칭, 명칭, 삭제그룹
- [x] 그룹 수정 모달 개선: 모든 데이터 표시
- [x] insert_mst.sql에 use_yn과 update_dt 필드 추가
- [x] ConMstDAO.insert_mst_data 메서드 수정
- [x] update_mst.sql에 update_dt 필드 추가 (수정시 자동 업데이트)
- [x] CSS에 inactive-row와 inactive-group 클래스 추가
- [x] 그룹 추가, 수정, 삭제 시 use_yn과 update_dt 입력 확인
- [x] 삭제한 그룹이 화면에 출력되지 않는 문제 해결
- [x] 그룹 삭제 시 use_yn과 update_dt 적용 문제 해결
- [x] DAO insert_mst_data 메서드 중복 commit 및 매개변수 불일치 문제 해결
- [x] DAO update_mst_data와 delete_mst_data 메서드 중복 commit 문제 해결
- [x] 그룹 수정시 사용여부 변경 UI 추가
- [x] 그룹 수정 모달에서 use_yn hardcoding 문제 해결
- [x] API 라우터에 그룹 수정 엔드포인트 추가
- [x] 그룹 수정 후 화면에 출력되지 않는 문제 해결
- [x] 그룹 수정 후 use_yn이 'Y'인데 사용안함으로 표시되는 문제 해결
- [x] 대소문자 구분 없는 검색 기능 구현
- [x] use_yn 값의 공백 문제 해결

## 남은 작업
- [ ] 변경 사항 테스트 및 검증
- [ ] 전체 기능 통합 테스트