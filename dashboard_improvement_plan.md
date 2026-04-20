# Dashboard Timezone & Data Display 개선 계획

> 작성일: 2026-04-17
> 수정일: 2026-04-20
> 상태: ✅ Build Mode 완료
> 관련 CR: REQ-2604-010

---

## 🎯 목표

### 1차 목표 (완료): Dashboard KST Timezone 처리 개선
- ✅ Frontend: `ui.js`에서 KST 기준 날짜 초기화 (`getKSTNow()` 사용)
- ✅ Backend: `utils/kst_utils.py` 공통 모듈 생성 (Python port of dateUtils.js)
- ✅ Backend: `dashboard_service.py`에서 status_code_service 빈 리스트 처리
- ✅ 결과: CD101 일간 성공률 100% 정상 표시

### 2차 목표 (✅ 완료): 100단위 Job ID 필터링 로직 추가
- ✅ 원인 확인: TB_CON_HIST에 CD400만 오늘 데이터 존재 (CD100, CD200은 데이터 없음)
- ✅ use_yn 확인: CD100, CD200, CD400 모두 'Y'
- ✅ 해결: `utils/job_utils.py` 공통 모듈 생성 및 `dashboard_service.py`에 필터링 적용
- ✅ 추가 개선: `mngr_sett_service.py`, `data_definition_api.py`, `data_definition_service.py` 중복 로직 리팩토링

### 3차 목표 (대기): 성공률 계산 공식 통일
- 📋 Card Summary와 Dashboard의 성공률 계산 방식 통일 검토
- 📋 현재: Dashboard = 성공/(성공+실패+미수집), Card Summary = 성공/(성공+실패)

---

## 🔍 현재 분석 상태

### 확인된 사실 (완료)

| 항목 | 상태 | 세부 내용 |
|------|------|-----------|
| CD101 timezone 처리 | ✅ 완료 | KST 기준 05:00, 09:00 정상 인식 |
| CD101 성공률 표시 | ✅ 완료 | 100% (1/1) 정상 표시 |
| status_code_service | ✅ 완료 | 빈 리스트 시 기본값 사용하도록 수정 |

### 미확인 사항 (진행 중)

| 항목 | 상태 | 의문점 |
|------|------|--------|
| CD400 표시 원인 | 🔍 분석 중 | 왜 CD400만 표시되고 CD100,200,300은 안 보이는지? |
| TB_CON_HIST 데이터 | ❓ 미확인 | CD100-CD400 각각 오늘 데이터 있는지? |
| TB_MST use_yn | ❓ 미확인 | CD400만 'Y', 나머진 'N'인지? |
| 100단위 필터링 | ❓ 미확인 | `dashboard_service.py`에 `_should_exclude_job` 로직 있어야 하나 없음 |

---

## 📋 할 일 목록 (Action Items)

### Phase 1: 원인 분석 (Plan Mode에서 진행, ✅ 완료)

- [x] CD101 시간대 문제 분석
- [x] `status_code_service` 빈 리스트 문제 확인
- [x] `collection_schedule_service.py` 매칭 로직 확인
- [x] **CD400 표시 원인 분석**
  - [x] TB_CON_HIST 오늘 데이터 확인 (CD100, CD200, CD300, CD400)
  - [x] TB_MST use_yn 설정값 확인 (CD100, CD200, CD400 = 'Y')
  - [x] Dashboard API 응답 job_id 리스트 확인
  - [x] `historical_summary_map` 키 값 확인

### Phase 2: 수정 구현 (Build Mode ✅ 완료)

- [x] `utils/kst_utils.py` 생성
- [x] `ui.js` KST 기준 날짜 초기화 수정
- [x] `dashboard_service.py` status_code_service 기본값 처리
- [x] **`utils/job_utils.py` 공통 모듈 생성** (방안 2)
  - [x] `should_exclude_job()` 함수 구현
  - [x] CD900~CD999 및 100단위 제외 로직
- [x] **`dashboard_service.py`에 100단위 필터링 로직 추가**
  - [x] `get_summary()`에서 100단위 제외 로직 적용
  - [x] 로깅 추가: "[FILTER] After 100-unit exclusion"
- [x] **기존 코드 리팩토링 (중복 제거)**
  - [x] `mngr_sett_service.py`: `_should_exclude_job()` → `utils.job_utils.should_exclude_job` import
  - [x] `data_definition_api.py`: 중복 검증 로직 → 공통 함수 사용
  - [x] `data_definition_service.py`: 7개 중복 로직 → 공통 함수 사용

### Phase 3: 검증 및 커밋 (⏳ 대기)

- [ ] Dashboard에서 CD400 미표시 확인
- [ ] CD101 성공률 계속 정상 표시 확인
- [ ] CR 보고서 작성 (REQ-2604-011)
- [ ] Git commit & push

---

## ✅ 수정 완료 파일 목록

| 파일 | 수정 내용 | 상태 |
|------|-----------|------|
| `utils/job_utils.py` | 신규 생성: 100단위 및 CD900~CD999 제외 공통 함수 | ✅ 완료 |
| `service/dashboard_service.py` | 100단위 필터링 로직 추가, import 추가 | ✅ 완료 |
| `service/mngr_sett_service.py` | `_should_exclude_job()` → 공통 함수 import로 리팩토링 | ✅ 완료 |
| `routes/api/data_definition_api.py` | 중복 검증 로직 → 공통 함수 사용 | ✅ 완료 |
| `service/data_definition_service.py` | 7개 중복 로직 → 공통 함수 사용 | ✅ 완료 |

---

## 🔧 구현 상세

### `utils/job_utils.py` (신규)
```python
def should_exclude_job(job_id):
    """100단위 및 CD900~CD999 제외 여부 확인"""
    if not job_id:
        return True
    
    job_id = str(job_id).upper().strip()
    match = re.match(r'CD(\d+)', job_id)
    
    if match:
        cd_number = int(match.group(1))
        return (900 <= cd_number <= 999) or (cd_number % 100 == 0)
    
    return False
```

### `dashboard_service.py` 적용 위치
```python
from utils.job_utils import should_exclude_job

# get_summary() 메서드 내, use_yn 필터 이후
filtered_job_ids = [
    jid for jid in filtered_job_ids
    if not should_exclude_job(jid)
]
logging.info(f"[FILTER] After 100-unit exclusion: {len(filtered_job_ids)} job IDs remaining")
```

---

## 🐛 이슈 분석: CD400 표시 문제

### 현재까지의 추정

**가설 A: TB_CON_HIST 데이터 차이**
```
TB_CON_HIST 오늘 데이터:
- CD100: 없음 또는 use_yn='N'
- CD200: 없음 또는 use_yn='N'
- CD300: 없음 또는 use_yn='N'
- CD400: 있음 (왜?)
```

**가설 B: use_yn 설정 차이**
```
TB_MST use_yn 설정:
- CD100: 'N'
- CD200: 'N'
- CD300: 'N'
- CD400: 'Y' (왜만 다를까?)
```

**가설 C: 100단위 필터링 로직 누락**
```python
# 현재 dashboard_service.py: 100단위 필터링 없음!
filtered_job_ids = [
    jid for jid in filtered_job_ids 
    if not self._should_exclude_job(jid)  # ← 이 로직 없음
]

# mngr_sett_service.py에는 있음
if (cd_number % 100 == 0):  # 100단위 제외
    return True
```

### 확인 필요 정보

1. **TB_CON_HIST SQL 확인:**
```sql
SELECT job_id, COUNT(*), MAX(start_dt)
FROM TB_CON_HIST
WHERE job_id IN ('CD100', 'CD200', 'CD300', 'CD400')
  AND DATE(start_dt AT TIME ZONE 'Asia/Seoul') = '2026-04-17'
GROUP BY job_id;
```

2. **TB_MST use_yn 확인:**
```sql
SELECT cd, use_yn, cd_nm
FROM TB_MST
WHERE cd IN ('CD100', 'CD200', 'CD300', 'CD400');
```

3. **Dashboard API 응답 확인:**
```javascript
fetch('/api/dashboard/summary?start_date=2026-04-17&end_date=2026-04-17')
  .then(r => r.json())
  .then(data => {
    const jobIds = data.map(i => i.job_id);
    console.log('Job IDs in response:', jobIds.filter(id => id.startsWith('CD4')));
  });
```

---

## 🔧 수정 계획 (Build Mode)

### 수정 대상 파일

| 파일 | 수정 내용 | 우선순위 |
|------|-----------|----------|
| `service/dashboard_service.py` | 100단위 필터링 로직 추가 | 🔴 높음 |
| `utils/kst_utils.py` | (완료) 공통 KST 유틸리티 | ✅ 완료 |
| `static/js/modules/dashboard/ui.js` | (완료) KST 기준 날짜 초기화 | ✅ 완료 |

### 세부 수정 방안

**방안 1: `_should_exclude_job` 메서드 직접 추가**
```python
# dashboard_service.py
class DashboardService:
    def _should_exclude_job(self, job_id):
        """100단위 및 CD900~CD999 제외"""
        if not job_id or not str(job_id).strip():
            return True
        
        job_id = str(job_id).upper()
        
        if job_id.startswith('CD') and len(job_id) > 2:
            try:
                cd_number = int(job_id[2:])
                if (cd_number >= 900 and cd_number <= 999) or (cd_number % 100 == 0):
                    return True
            except ValueError:
                pass
        
        return False
    
    def get_summary(self, ...):
        # ... existing code ...
        
        # 100단위 제외 로직 추가
        filtered_job_ids = [
            jid for jid in filtered_job_ids 
            if not self._should_exclude_job(jid)
        ]
```

**방안 2: 공통 유틸리티로 분리**
```python
# utils/job_utils.py
import re

def should_exclude_job(job_id):
    """100단위 및 CD900~CD999 제외"""
    if not job_id:
        return True
    
    job_id = str(job_id).upper()
    match = re.match(r'CD(\d+)', job_id)
    
    if match:
        cd_number = int(match.group(1))
        return (cd_number >= 900 and cd_number <= 999) or (cd_number % 100 == 0)
    
    return False

# dashboard_service.py
from utils.job_utils import should_exclude_job

# 사용
filtered_job_ids = [jid for jid in filtered_job_ids if not should_exclude_job(jid)]
```

---

## 📝 다음 단계 (Build Mode 작업 순서)

1. **원인 분석 완료** ← 먼저 위 SQL/API 확인 필요
2. **수정 방안 선택** (방안 1 또는 2)
3. **코드 수정** (`dashboard_service.py`)
4. **테스트** (CD400 미표시 확인)
5. **CR 보고서 작성** (REQ-2604-011)
6. **Git commit**

---

## ❓ 사용자 확인 필요 사항

**지금 바로 확인 가능한 것:**

1. **TB_CON_HIST 데이터 현황** - 오늘 CD100-CD400 데이터 각각 있는지?
2. **TB_MST use_yn 설정** - CD400만 'Y'인지?
3. **Dashboard API 응답** - job_id 리스트에 CD400만 있는지?

**어느 것부터 확인할까요?** 아니면 **바로 수정**하고 테스트할까요?
