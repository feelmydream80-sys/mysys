# API 키 관리 기능 개발 보고서

## 1. 프로젝트 개요

API 키 관리 기능은 TB_API_KEY_MNGR 테이블을 관리하는 시스템으로, CD 값을 자동으로 업데이트하고 유통기한을 시각화하는 기능을 제공합니다.

## 2. 구현 기능

### 2.1 데이터 설정 기능
- TB_API_KEY_MNGR 테이블 데이터 조회
- CD 업데이트 버튼 (TB_MNGR_SETT -> TB_API_KEY_MNGR)
- CD 값 자동 추가 로직
  - TB_CON_MST에서 ITEM10값 가져오기
  - UDATE_DT를 START_DT로 설정
  - DUE 기본값 1년 설정

### 2.2 기간 차트 기능
- 유통기한 정보 조회
- 차트로 유통기한 시각화
- 1개월 이내 유통기한 빨간색으로 표시
- 남은 기간 표시

## 3. 개발 구조

### 3.1 백엔드 (Python/Flask)
```
- dao/api_key_mngr_dao.py          : 데이터 접근 레이어
- dao/con_mst_dao.py               : 마스터 데이터 접근
- service/api_key_mngr_service.py   : 비즈니스 로직 레이어
- routes/api/api_key_mngr_routes.py : API 라우트
- routes/ui/api_key_mngr_routes.py  : UI 라우트
```

### 3.2 프론트엔드 (JavaScript/Tailwind CSS)
```
- static/js/modules/common/api/api_key_mngr.js    : API 통신
- static/js/modules/api_key_mngr/data.js           : 데이터 관리
- static/js/modules/api_key_mngr/ui.js             : UI 렌더링
- static/js/pages/api_key_mngr.js                   : 페이지 로직
- templates/api_key_mngr.html                       : 템플릿
```

### 3.3 데이터베이스
```
- DDL/tb_api_key_mngr.sql       : 테이블 스키마
- etc/add_api_key_mngr_menu.sql  : 메뉴 설정
- sql/api_key_mngr/              : SQL 쿼리 파일
```

### 3.4 테스트
```
- tests/test_api_key_mngr.py             : 기본 테스트
- tests/test_api_key_mngr_simple.py      : 간단한 테스트
- tests/test_api_key_mngr_full_flow.py   : 전체 흐름 테스트
- tests/test_api_key_mngr_endpoint.py    : 엔드포인트 테스트
- tests/test_con_mst_dao_fix_updated.py  : ConMstDAO 테스트
- tests/test_api_key_mngr_executor.py    : 테스트 실행기
```

## 4. 주요 로직

### 4.1 CD 업데이트 프로세스
```python
# service/api_key_mngr_service.py
def update_cd_from_mngr_sett():
    1. TB_MNGR_SETT의 CD 목록 조회
    2. TB_API_KEY_MNGR와 비교
    3. 없는 CD 찾기
    4. TB_CON_MST에서 ITEM10, UDATE_DT 조회
    5. TB_API_KEY_MNGR에 삽입 (DUE=1)
```

### 4.2 유통기한 계산
```python
# service/api_key_mngr_service.py
def get_api_key_expiry_info():
    1. START_DT + DUE년 = 만료일
    2. 현재일과 만료일 차이 계산
    3. 1개월 이내 여부 판단 (is_urgent)
    4. 남은 기간(월) 계산
```

## 5. 테스트 결과

### 5.1 실행된 테스트
```
- tests/test_api_key_mngr.py             : 6개의 테스트 성공
- tests/test_api_key_mngr_simple.py      : 7개의 테스트 성공
- tests/test_api_key_mngr_full_flow.py   : 3개의 테스트 성공
- tests/test_con_mst_dao_fix_updated.py  : 2개의 테스트 성공
```

### 5.2 테스트 실행
```bash
python tests/test_api_key_mngr_executor.py
```

## 6. 사용 방법

### 6.1 메뉴 접근
1. 로그인 (admin / admin)
2. API 키 관리 메뉴 접근 (사이드바)

### 6.2 CD 업데이트
1. 데이터 설정 탭에서 CD 업데이트 버튼 클릭
2. 시스템이 자동으로 TB_MNGR_SETT의 CD를 찾아 업데이트

### 6.3 기간 차트
1. 기간 차트 탭으로 이동
2. 각 CD의 유통기한 차트 확인
3. 빨간색: 1개월 이내, 초록색: 여유 있음

## 7. 주요 변경 사항

### 7.1 데이터베이스
- TB_API_KEY_MNGR 테이블 추가
- API_OWNR_EMAIL_ADDR 컬럼 추가 (ITEM10 매핑)

### 7.2 서비스 로직
- ApiKeyMngrService.update_cd_from_mngr_sett() 메서드 개선
- ConMstDAO.get_mst_data_by_cd() 메서드 수정
- 환경 컨텍스트 문제 해결

## 8. 버그 및 해결 사항

### 8.1 Flask 컨텍스트 오류
- 문제: 테스트 실행시 Working outside of application context 오류
- 해결: g.db_conn 설정에서 예외 처리 추가

### 8.2 컬럼 매핑 문제
- 문제: TB_CON_MST의 update_dt/udate_dt 컬럼 매핑
- 해결: 서비스 메서드에서 두가지 컬럼명 모두 처리

### 8.3 유니코드 출력 오류
- 문제: Windows에서 이모지 문자열 출력 오류
- 해결: 테스트 메시지에서 이모지 제거

## 9. 향후 개선 사항

### 9.1 기능 확장
- API 키 생성/수정/삭제 UI 추가
- 유통기한 알림 기능
- API 키 사용 이력 추적

### 9.2 성능 개선
- 대량 CD 업데이트 시 트랜잭션 관리
- 쿼리 성능 최적화

### 9.3 테스트 확장
- 통합 테스트 확장
- UI 테스트 추가
- 부하 테스트

## 10. 결론

API 키 관리 기능은 요구 사항을 충족하는 방식으로 구현되었습니다. CD 업데이트 기능은 TB_MNGR_SETT와 TB_CON_MST를 연동하여 자동으로 데이터를 갱신하며, 기간 차트 기능은 유통기한을 직관적으로 시각화합니다.

개발 과정에서 발생한 문제들은 모두 해결되었으며, 테스트를 통해 기능의 안정성이 확인되었습니다. 향후 기능 확장을 통해 더욱 완성된 시스템으로 발전시킬 수 있습니다.