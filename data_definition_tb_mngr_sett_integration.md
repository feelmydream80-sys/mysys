# 데이터 정의 기능에서 tb_mngr_sett 연동 코드 분석

## 1. 연동 구조 개요

데이터 정의 기능에서 tb_mngr_sett 테이블과의 연동은 **서비스 계층(service/data_definition_service.py)**에서 처리됩니다. 기존의 PostgreSQL 트리거 방식 대신, 애플리케이션 레벨에서 직접 연동 로직을 구현한 구조입니다.

## 2. 연동 코드 분석

### 2.1. 서비스 계층 (service/data_definition_service.py)

#### 기본 설정 상수
```python
# Default settings for mngr_sett
DEFAULT_MNGR_SETT = {
    'cnn_failr_thrs_val': 5,
    'cnn_warn_thrs_val': 3,
    'cnn_failr_icon_id': 2,
    'cnn_failr_wrd_colr': '#dc3545',
    'cnn_warn_icon_id': 5,
    'cnn_warn_wrd_colr': '#ffc107',
    'cnn_sucs_icon_id': 1,
    'cnn_sucs_wrd_colr': '#28a745',
    'dly_sucs_rt_thrs_val': 95.0,
    'dd7_sucs_rt_thrs_val': 90.0,
    'mthl_sucs_rt_thrs_val': 85.0,
    'mc6_sucs_rt_thrs_val': 80.0,
    'yy1_sucs_rt_thrs_val': 75.0,
    'sucs_rt_sucs_icon_id': 1,
    'sucs_rt_sucs_wrd_colr': '#28a745',
    'sucs_rt_warn_icon_id': 5,
    'sucs_rt_warn_wrd_colr': '#ffc107',
    'chrt_colr': '#007bff',
    'chrt_dsp_yn': 'Y',
    'grass_chrt_min_colr': '#9be9a8',
    'grass_chrt_max_colr': '#216e39'
}
```

#### create_data 메소드 (데이터 생성 시 연동)
```python
def create_data(self, data):
    """새로운 데이터를 생성합니다."""
    try:
        # 데이터 유효성 검사
        cd_cl = data.get('cd_cl')
        cd = data.get('cd')
        
        if not cd_cl or not cd:
            raise ValueError("CD_CL and CD are required.")
        
        # CD는 'CD'로 시작해야 함
        if not cd.startswith('CD'):
            raise ValueError("CD must start with 'CD'.")
        
        # 중복 검사
        existing_data = self.con_mst_dao.get_mst_data_by_cd(cd)
        if existing_data:
            raise ValueError(f"Data with CD {cd} already exists.")
        
        # 데이터 삽입
        self.con_mst_dao.insert_mst_data(data)
        self.logger.info(f"Data created successfully: {cd}")
        
        # tb_mngr_sett 테이블에 자동으로 데이터 삽입 (CD900-CD999 범위와 100의 배수는 제외)
        cd_number = int(cd[2:]) if cd.startswith('CD') and cd[2:].isdigit() else None
        if cd_number and not ((900 <= cd_number <= 999) or (cd_number % 100 == 0)):
            self.create_mngr_sett(cd)
            self.logger.info(f"Auto created mngr sett for CD: {cd}")
        
    except Exception as e:
        self.logger.error(f"Error in create_data: {e}", exc_info=True)
        raise
```

#### create_mngr_sett 메소드 (관리자 설정 생성)
```python
def create_mngr_sett(self, cd):
    """관리자 설정 데이터를 생성합니다."""
    try:
        # 기존 설정 확인
        existing_settings = self.mngr_sett_dao.get_settings_by_cd(cd)
        if existing_settings:
            self.logger.info(f"Mngr sett already exists for CD: {cd}")
            return
        
        # 기본 설정에 랜덤 색상 추가
        new_setting_data = DEFAULT_MNGR_SETT.copy()
        new_setting_data['cd'] = cd
        new_setting_data['chrt_colr'] = get_random_hex_color()
        
        # 설정 삽입
        self.mngr_sett_dao.insert_settings(new_setting_data)
        self.logger.info(f"Mngr sett created successfully for CD: {cd}")
    except Exception as e:
        self.logger.error(f"Error in create_mngr_sett: {e}", exc_info=True)
        raise
```

### 2.2. API 계층 (routes/api/data_definition_api.py)

#### create_mngr_sett API
```python
@bp.route('/create_mngr_sett', methods=['POST'])
@login_required
@check_password_change_required
def create_mngr_sett():
    """관리자 설정 데이터를 생성합니다."""
    try:
        data = request.json
        cd = data.get('cd')
        
        if not cd:
            return jsonify({"message": "CD is required."}), 400
            
        # CD900-CD999 범위와 100의 배수는 제외
        cd_number = int(cd[2:]) if cd.startswith('CD') and cd[2:].isdigit() else None
        if cd_number and ((900 <= cd_number <= 999) or (cd_number % 100 == 0)):
            return jsonify({"message": "CD900-CD999 범위와 100의 배수는 제외됩니다."}), 400
        
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            service.create_mngr_sett(cd)
            conn.commit()
            return jsonify({"message": "Mngr sett created successfully."}), 201
    except ValueError as e:
        logging.warning(f"Failed to create mngr sett: {e}")
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"Error creating mngr sett: {e}", exc_info=True)
        return jsonify({"message": "Error creating mngr sett."}), 500
```

### 2.3. DAO 계층 (dao/mngr_sett_dao.py)

```python
class MngrSettDAO:
    """
    Data Access Object for admin settings.
    Handles all database operations for the TB_MNGR_SETT table.
    """
    def __init__(self, db_connection):
        self.conn = db_connection
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_settings_by_cd(self, cd: str) -> Optional[Dict]:
        """
        Retrieves settings for a specific cd from the database.
        """
        query = load_sql('mngr_sett/get_mngr_sett.sql')
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, (cd,))
                result = cur.fetchone()
                if result:
                    return dict(result)
                return None
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error fetching settings for CD {cd}: {e}", exc_info=True)
            raise

    def insert_settings(self, settings_data: Dict):
        """
        Inserts new settings into the database.
        """
        query = load_sql('mngr_sett/insert_mngr_sett.sql')
        # The order of values must match the order of columns in the INSERT query
        values = (
            settings_data.get('cd'),
            settings_data.get('cnn_failr_thrs_val'),
            settings_data.get('cnn_warn_thrs_val'),
            settings_data.get('cnn_failr_icon_id'),
            settings_data.get('cnn_failr_wrd_colr'),
            settings_data.get('cnn_warn_icon_id'),
            settings_data.get('cnn_warn_wrd_colr'),
            settings_data.get('cnn_sucs_icon_id'),
            settings_data.get('cnn_sucs_wrd_colr'),
            settings_data.get('dly_sucs_rt_thrs_val'),
            settings_data.get('dd7_sucs_rt_thrs_val'),
            settings_data.get('mthl_sucs_rt_thrs_val'),
            settings_data.get('mc6_sucs_rt_thrs_val'),
            settings_data.get('yy1_sucs_rt_thrs_val'),
            settings_data.get('sucs_rt_sucs_icon_id'),
            settings_data.get('sucs_rt_sucs_wrd_colr'),
            settings_data.get('sucs_rt_warn_icon_id'),
            settings_data.get('sucs_rt_warn_wrd_colr'),
            settings_data.get('chrt_colr'),
            settings_data.get('chrt_dsp_yn'),
            settings_data.get('grass_chrt_min_colr'),
            settings_data.get('grass_chrt_max_colr')
        )
        self.logger.info(f"DAO: Insert values: {values}")
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, values)
        except psycopg2.Error as e:
            self.logger.error(f"DAO: Error inserting settings for CD {settings_data.get('cd')}: {e}", exc_info=True)
            raise
```

## 3. 연동 로직 특징

### 3.1. 자동 연동 조건

데이터 정의에서 tb_mngr_sett와 연동되는 조건은 다음과 같습니다:

| 조건 | 설명 | 처리 |
|------|------|------|
| CD format | CD로 시작하는 코드 | 필수 |
| CD range | 900~999 범위 | 제외 |
| CD divisible by 100 | 100의 배수 | 제외 |
| Existing settings | 기존 설정 존재 | 스킵 |

### 3.2. 자동 생성 시점

1. **데이터 생성시**: `create_data` 메소드에서 자동으로 호출
2. **수동 생성**: `/api/data_definition/create_mngr_sett` API로 직접 호출

### 3.3. 기본 설정

tb_mngr_sett에 삽입되는 기본 설정은 `DEFAULT_MNGR_SETT`에서 정의되며, 각 필드에 대해 다음과 같은 기본값을 가지고 있습니다:

- **연결 임계값**: cnn_failr_thrs_val=5, cnn_warn_thrs_val=3
- **연결 아이콘**: cnn_failr_icon_id=2, cnn_warn_icon_id=5, cnn_sucs_icon_id=1
- **연결 색상**: 빨강(#dc3545), 노랑(#ffc107), 초록(#28a745)
- **성공률 임계값**: 일간95%, 7일90%, 월간85%, 6개월80%, 연간75%
- **차트 설정**: chrt_colr는 랜덤 색상, chrt_dsp_yn='Y'

## 4. 프론트엔드 연동

### 4.1. 데이터 정의 API 호출

static/js/tabs/dataDefinition/modules/api.js에서 다음 API를 사용합니다:

```javascript
export async function createItem(data) {
    return callAPI(API_ENDPOINTS.CREATE, 'POST', data);
}
```

### 4.2. 연동 흐름

1. 사용자가 데이터 정의에서 새로운 항목을 추가합니다.
2. 프론트엔드가 `/api/data_definition/create` API를 호출합니다.
3. 백엔드에서는 DataDefinitionService.create_data 메소드를 실행합니다.
4. tb_con_mst에 데이터를 삽입한 후, tb_mngr_sett에 자동으로 설정을 생성합니다.
5. 프론트엔드는 성공 메시지를 받아와 UI를 업데이트합니다.

## 5. 테스트 시나리오

### 5.1. 자동 생성 테스트

#### Test Case 1: 일반 코드 자동 생성
- **Test Steps**:
  1. 데이터 정의에서 CD101을 추가합니다.
  2. tb_mngr_sett에 CD101이 자동으로 생성되는지 확인합니다.
- **Expected Results**:
  - tb_con_mst에 CD101이 삽입됨
  - tb_mngr_sett에 CD101이 자동으로 삽입됨
  - chrt_colr에 랜덤 색상이 설정됨

#### Test Case 2: 제외 코드 스킵
- **Test Steps**:
  1. 데이터 정의에서 CD910을 추가합니다.
  2. tb_mngr_sett에 CD910이 생성되지 않는지 확인합니다.
- **Expected Results**:
  - tb_con_mst에 CD910이 삽입됨
  - tb_mngr_sett에 CD910이 생성되지 않음

#### Test Case 3: 100 배수 코드 스킵
- **Test Steps**:
  1. 데이터 정의에서 CD400을 추가합니다.
  2. tb_mngr_sett에 CD400이 생성되지 않는지 확인합니다.
- **Expected Results**:
  - tb_con_mst에 CD400이 삽입됨
  - tb_mngr_sett에 CD400이 생성되지 않음

### 5.2. 수동 생성 테스트

#### Test Case 4: 수동 생성 API 호출
- **Test Steps**:
  1. `/api/data_definition/create_mngr_sett` API를 호출합니다.
  2. 요청 데이터로 {"cd": "CD105"}를 전송합니다.
  3. tb_mngr_sett에 CD105가 생성되는지 확인합니다.
- **Expected Results**:
  - tb_mngr_sett에 CD105가 삽입됨
  - 기본 설정 값이正确设置됨

## 6. 개선建议

### 6.1. 삭제 연동 부족

현재 데이터 정의 기능에서 tb_mngr_sett와의 연동은 **생성만 지원**하며, 삭제 연동이 없습니다. 데이터를 삭제할 때 tb_mngr_sett의 설정도 함께 삭제하도록 개선해야 합니다.

```python
# service/data_definition_service.py에서 delete_data 메소드 개선
def delete_data(self, cd_cl, cd):
    """데이터를 삭제합니다. (소프트 삭제)"""
    try:
        # 데이터 존재 여부 확인
        existing_data = self.con_mst_dao.get_mst_data_by_cd(cd)
        if not existing_data:
            raise ValueError(f"Data with CD {cd} does not exist.")
        
        # tb_mngr_sett에서 설정 삭제
        cd_number = int(cd[2:]) if cd.startswith('CD') and cd[2:].isdigit() else None
        if cd_number and not ((900 <= cd_number <= 999) or (cd_number % 100 == 0)):
            self.mngr_sett_dao.delete_settings(cd)
            self.logger.info(f"Mngr sett deleted successfully for CD: {cd}")
        
        # 데이터 삭제 (소프트 삭제)
        self.con_mst_dao.delete_mst_data(cd_cl, cd)
        self.logger.info(f"Data deleted successfully: {cd}")
    except Exception as e:
        self.logger.error(f"Error in delete_data: {e}", exc_info=True)
        raise
```

### 6.2. 수정 연동 부족

데이터 정의에서 tb_mngr_sett의 설정을 수정하는 기능도 지원되어야 합니다. 현재는 수동으로 API를 호출하거나 관리자 설정 페이지를 통해 수정해야 합니다.

### 6.3. 조회 연동 부족

데이터 정의에서 tb_mngr_sett의 설정을 조회하는 기능도 추가해야 합니다. 사용자가 데이터 정보와 함께 설정을 확인할 수 있도록 UI를 개선해야 합니다.

## 7. 결론

데이터 정의 기능에서 tb_mngr_sett와의 연동은 **서비스 계층에서 직접 구현**된 구조로, PostgreSQL 트리거를 사용하지 않습니다. 데이터 생성 시 자동으로 tb_mngr_sett에 설정을 생성하는 로직이 구현되어 있으나, 삭제, 수정, 조회 연동이 부족합니다.

이 구조는 애플리케이션 레벨에서 연동 로직을 제어하기 쉽다는 장점이 있지만, 코드 중복과 유지보수성 문제가 발생할 수 있습니다. 따라서, 연동 로직을 더욱 명확하게 분리하고, 삭제와 수정 연동을 추가하는 것이 좋습니다.