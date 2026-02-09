# tb_mngr_sett 테이블과 데이터 정의 기능 연동 분석

## 1. tb_mngr_sett 테이블 개요

### 1.1. 테이블 구조

```sql
CREATE TABLE IF NOT EXISTS public.tb_mngr_sett (
    cd character varying(50) COLLATE pg_catalog."default" NOT NULL,
    cnn_failr_thrs_val integer DEFAULT 3,
    cnn_warn_thrs_val integer DEFAULT 2,
    cnn_failr_icon_id integer,
    cnn_failr_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#dc3545'::character varying,
    cnn_warn_icon_id integer,
    cnn_warn_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#ffc107'::character varying,
    cnn_sucs_icon_id integer,
    cnn_sucs_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#28a745'::character varying,
    dly_sucs_rt_thrs_val integer DEFAULT 80,
    dd7_sucs_rt_thrs_val integer DEFAULT 75,
    mthl_sucs_rt_thrs_val integer DEFAULT 70,
    mc6_sucs_rt_thrs_val integer DEFAULT 65,
    yy1_sucs_rt_thrs_val integer DEFAULT 60,
    sucs_rt_sucs_icon_id integer,
    sucs_rt_sucs_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#28a745'::character varying,
    sucs_rt_warn_icon_id integer,
    sucs_rt_warn_wrd_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#ffc107'::character varying,
    chrt_prd_value integer DEFAULT 1,
    chrt_tp character varying(20) COLLATE pg_catalog."default" DEFAULT 'line'::character varying,
    chrt_dsp_job_id text COLLATE pg_catalog."default",
    chrt_dsp_yn boolean DEFAULT true,
    chrt_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#42A5F5'::character varying,
    grass_chrt_min_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#9be9a8'::character varying,
    grass_chrt_max_colr character varying(7) COLLATE pg_catalog."default" DEFAULT '#216e39'::character varying,
    CONSTRAINT tb_admin_settings_pkey PRIMARY KEY (cd)
)
```

### 1.2. 주요 컬럼 설명

| 컬럼명 | 타입 | 기본값 | 설명 |
|-------|------|--------|------|
| cd | VARCHAR(50) | - | Job ID (기본키, tb_con_mst의 cd와 연동) |
| cnn_failr_thrs_val | INTEGER | 3 | 연결 실패 임계값 |
| cnn_warn_thrs_val | INTEGER | 2 | 연결 경고 임계값 |
| cnn_failr_icon_id | INTEGER | - | 연결 실패 아이콘 ID |
| cnn_failr_wrd_colr | VARCHAR(7) | #dc3545 | 연결 실패 단어 색상 |
| cnn_warn_icon_id | INTEGER | - | 연결 경고 아이콘 ID |
| cnn_warn_wrd_colr | VARCHAR(7) | #ffc107 | 연결 경고 단어 색상 |
| cnn_sucs_icon_id | INTEGER | - | 연결 성공 아이콘 ID |
| cnn_sucs_wrd_colr | VARCHAR(7) | #28a745 | 연결 성공 단어 색상 |
| dly_sucs_rt_thrs_val | INTEGER | 80 | 일간 성공률 임계값 |
| dd7_sucs_rt_thrs_val | INTEGER | 75 | 7일 성공률 임계값 |
| mthl_sucs_rt_thrs_val | INTEGER | 70 | 월간 성공률 임계값 |
| mc6_sucs_rt_thrs_val | INTEGER | 65 | 6개월 성공률 임계값 |
| yy1_sucs_rt_thrs_val | INTEGER | 60 | 연간 성공률 임계값 |
| sucs_rt_sucs_icon_id | INTEGER | - | 성공률 성공 아이콘 ID |
| sucs_rt_sucs_wrd_colr | VARCHAR(7) | #28a745 | 성공률 성공 단어 색상 |
| sucs_rt_warn_icon_id | INTEGER | - | 성공률 경고 아이콘 ID |
| sucs_rt_warn_wrd_colr | VARCHAR(7) | #ffc107 | 성공률 경고 단어 색상 |
| chrt_prd_value | INTEGER | 1 | 차트 기간 값 |
| chrt_tp | VARCHAR(20) | line | 차트 타입 |
| chrt_dsp_job_id | TEXT | - | 차트 표시 Job ID |
| chrt_dsp_yn | BOOLEAN | true | 차트 표시 여부 |
| chrt_colr | VARCHAR(7) | #42A5F5 | 차트 색상 |
| grass_chrt_min_colr | VARCHAR(7) | #9be9a8 | 그래스 차트 최소 색상 |
| grass_chrt_max_colr | VARCHAR(7) | #216e39 | 그래스 차트 최대 색상 |

## 2. tb_con_mst와의 연동 메커니즘

### 2.1. 트리거 함수

```sql
CREATE OR REPLACE FUNCTION insert_mngr_sett_on_con_mst_insert()
RETURNS TRIGGER AS $$
DECLARE
    cd_number INTEGER;
BEGIN
    -- Check if settings already exist for the cd value in tb_mngr_sett
    IF NOT EXISTS (SELECT 1 FROM tb_mngr_sett WHERE cd = NEW.cd) THEN
        -- Check if cd starts with 'CD' followed by numbers
        IF NEW.cd LIKE 'CD%' AND LENGTH(NEW.cd) > 2 THEN
            -- Try to convert the part after 'CD' to a number
            BEGIN
                cd_number := SUBSTRING(NEW.cd, 3)::INTEGER;
                
                -- Skip insertion if:
                -- 1. The number is between 900 and 999 (CD900-CD999)
                -- 2. The number is divisible by 100 (100, 200, 300, ..., 1000, 1100, ...)
                IF (cd_number >= 900 AND cd_number <= 999) OR (cd_number % 100 = 0) THEN
                    RETURN NEW; -- Skip insertion for these special cases
                END IF;
            EXCEPTION 
                WHEN invalid_text_representation THEN
                    -- If conversion fails, continue with normal insertion
                    NULL;
            END;
        END IF;
        
        -- Insert default settings only if they don't already exist and don't match exclusion criteria
        INSERT INTO tb_mngr_sett (
            cd,
            cnn_failr_thrs_val,
            cnn_warn_thrs_val,
            cnn_failr_icon_id,
            cnn_failr_wrd_colr,
            cnn_warn_icon_id,
            cnn_warn_wrd_colr,
            cnn_sucs_icon_id,
            cnn_sucs_wrd_colr,
            dly_sucs_rt_thrs_val,
            dd7_sucs_rt_thrs_val,
            mthl_sucs_rt_thrs_val,
            mc6_sucs_rt_thrs_val,
            yy1_sucs_rt_thrs_val,
            sucs_rt_sucs_icon_id,
            sucs_rt_sucs_wrd_colr,
            sucs_rt_warn_icon_id,
            sucs_rt_warn_wrd_colr,
            chrt_colr,
            chrt_dsp_yn,
            grass_chrt_min_colr,
            grass_chrt_max_colr
        ) VALUES (
            NEW.cd,
            5,    -- CNN_FAILR_THRS_VAL
            3,    -- CNN_WARN_THRS_VAL
            2,    -- CNN_FAILR_ICON_ID
            '#dc3545',  -- CNN_FAILR_WRD_COLR
            5,    -- CNN_WARN_ICON_ID
            '#ffc107',  -- CNN_WARN_WRD_COLR
            1,    -- CNN_SUCS_ICON_ID
            '#28a745',  -- CNN_SUCS_WRD_COLR
            95, -- DLY_SUCS_RT_THRS_VAL
            90, -- DD7_SUCS_RT_THRS_VAL
            85, -- MTHL_SUCS_RT_THRS_VAL
            80, -- MC6_SUCS_RT_THRS_VAL
            75, -- YY1_SUCS_RT_THRS_VAL
            1,    -- SUCS_RT_SUCS_ICON_ID
            '#28a745',  -- SUCS_RT_SUCS_WRD_COLR
            5,    -- SUCS_RT_WARN_ICON_ID
            '#ffc107',  -- SUCS_RT_WARN_WRD_COLR
            '#007bff',  -- CHRT_COLR
            true, -- CHRT_DSP_YN (boolean type)
            '#9be9a8',  -- GRASS_CHRT_MIN_COLR
            '#216e39'   -- GRASS_CHRT_MAX_COLR
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.2. 트리거 동작 조건

- **INSERT 이벤트**: tb_con_mst에 새 레코드가 삽입될 때 트리거 실행
- **중복 체크**: tb_mngr_sett에 같은 cd 값이 존재하는지 확인
- **예외 처리**: 
  - CD900~CD999 범위의 코드는 건너뜀
  - 100의 배수인 코드(CD100, CD200 등)는 건너뜀
- **기본값 설정**: 조건에 맞는 코드에 대해 기본 설정값을 tb_mngr_sett에 삽입

## 3. tb_mngr_sett 데이터 예시

DDL/data/tb_mngr_sett.csv 파일에는 다음과 같은 데이터가 포함되어 있습니다:

```csv
CD101,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,f,#007bff,#ea9fe1,#61216e
CD102,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,t,#00ff11,#8bc940,#216e39
CD103,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,t,#2b00ff,#9be9a8,#216e39
CD104,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,t,#d400ff,#9be9a8,#216e39
CD201,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,t,#007bff,#9be9a8,#216e39
CD301,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,t,#3c40be,#9be9a8,#216e39
CD302,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,t,#f66aa7,#9be9a8,#216e39
CD303,5,3,2,#dc3545,5,#ffc107,1,#28a745,95,90,85,80,75,1,#28a745,5,#ffc107,1,line,,t,#0b57a8,#9be9a8,#216e39
```

### 3.1. 데이터 특징

- **Job ID**: CD101, CD102, CD103, CD104, CD201, CD301, CD302, CD303
- **공통 설정**: 대부분의 필드에 기본값이 설정됨
- **차트 설정**: chrt_tp는 'line'으로 통일, chrt_dsp_yn은 대부분 true
- **색상 설정**: 각 Job마다 chrt_colr, grass_chrt_min_colr, grass_chrt_max_colr가 다름

## 4. 데이터 정의 기능과의 연동 분석

### 4.1. 데이터 정의에서의 tb_mngr_sett 활용

현재 데이터 정의 기능(dataDefinition.js)에서 tb_mngr_sett와 직접 연동하는 코드는 **없습니다**. 하지만, tb_con_mst에 데이터를 삽입할 때 트리거를 통해 자동으로 tb_mngr_sett에 레코드가 생성됩니다.

### 4.2. 누락된 기능

1. **tb_mngr_sett 데이터 조회**: 데이터 정의에서 tb_mngr_sett의 설정을 조회하는 기능이 없음
2. **tb_mngr_sett 데이터 수정**: 데이터 정의에서 tb_mngr_sett의 설정을 수정하는 기능이 없음
3. **tb_mngr_sett 데이터 삭제**: 데이터 정의에서 tb_mngr_sett의 설정을 삭제하는 기능이 없음
4. **tb_mngr_sett와의 동기화**: tb_con_mst의 데이터를 삭제할 때 tb_mngr_sett의 데이터도 삭제하는 기능이 없음

### 4.3. 개선建议

1. **tb_mngr_sett 조회 API**: 데이터 정의에서 tb_mngr_sett의 설정을 조회할 수 있는 API 추가
2. **tb_mngr_sett 수정 API**: 데이터 정의에서 tb_mngr_sett의 설정을 수정할 수 있는 API 추가
3. **tb_mngr_sett 삭제 API**: 데이터 정의에서 tb_mngr_sett의 설정을 삭제할 수 있는 API 추가
4. **삭제 트리거**: tb_con_mst의 데이터를 삭제할 때 tb_mngr_sett의 데이터도 삭제하는 트리거 추가
5. **UI 컴포넌트**: 데이터 정의에서 tb_mngr_sett의 설정을 관리할 수 있는 UI 컴포넌트 추가

## 5. 테스트 시나리오

### 5.1. 기본 기능 테스트

#### Test Case 1: tb_mngr_sett 자동 생성
- **Test Steps**:
  1. 데이터 정의에서 새로운 Job ID(CD105)를 추가
  2. tb_mngr_sett에 CD105 레코드가 자동으로 생성되는지 확인
- **Expected Results**:
  - tb_mngr_sett에 CD105 레코드가 생성
  - 기본값이正确设置

#### Test Case 2: 예외 코드 처리
- **Test Steps**:
  1. 데이터 정의에서 CD910(900~999 범위)를 추가
  2. tb_mngr_sett에 CD910 레코드가 생성되지 않는지 확인
- **Expected Results**:
  - tb_mngr_sett에 CD910 레코드가 생성되지 않음

#### Test Case 3: 100 배수 코드 처리
- **Test Steps**:
  1. 데이터 정의에서 CD400(100의 배수)를 추가
  2. tb_mngr_sett에 CD400 레코드가 생성되지 않는지 확인
- **Expected Results**:
  - tb_mngr_sett에 CD400 레코드가 생성되지 않음

### 5.2. 연동 기능 테스트

#### Test Case 4: tb_mngr_sett 데이터 조회
- **Test Steps**:
  1. 데이터 정의에서 Job ID(CD101)를 선택
  2. 해당 Job의 tb_mngr_sett 설정을 조회
- **Expected Results**:
  - tb_mngr_sett의 설정이正确显示

#### Test Case 5: tb_mngr_sett 데이터 수정
- **Test Steps**:
  1. 데이터 정의에서 Job ID(CD101)를 선택
  2. tb_mngr_sett의 설정을 수정(예: cnn_failr_thrs_val을 5에서 6으로 변경)
  3. 변경된 설정이 tb_mngr_sett에 저장되는지 확인
- **Expected Results**:
  - tb_mngr_sett의 설정이正确更新

#### Test Case 6: tb_mngr_sett 데이터 삭제
- **Test Steps**:
  1. 데이터 정의에서 Job ID(CD105)를 삭제
  2. tb_mngr_sett에서 CD105 레코드가 삭제되는지 확인
- **Expected Results**:
  - tb_mngr_sett에서 CD105 레코드가 삭제

## 6. 결론

현재 데이터 정의 기능은 tb_con_mst와 tb_mngr_sett의 연동에 대한 지원이 부족합니다. tb_con_mst에 데이터를 삽입할 때 자동으로 tb_mngr_sett에 레코드가 생성되는 트리거는 존재하지만, 반대 방향의 연동(삭제, 수정)이나 조회 기능이 없습니다.

데이터 정의 기능을 완벽하게 하려면, tb_mngr_sett와의 연동을 지원하는 API와 UI 컴포넌트를 추가해야 합니다. 이를 통해 Job ID의 설정을 한 곳에서 관리할 수 있게 되어 사용자 경험을 개선할 수 있습니다.