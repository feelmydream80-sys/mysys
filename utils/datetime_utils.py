from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import pytz
from flask import current_app

def is_within_schedule_grace_period(
    schedule_dt_aware: datetime,
    history_dt_utc: Optional[datetime],
    grace_minutes: int = 5
) -> bool:
    """
    예정된 시간(schedule_dt_aware)과 실제 기록된 시간(history_dt_utc)을 비교하여
    허용 오차 시간(grace_minutes) 내에 있는지 확인합니다.

    - history_dt_utc가 없으면 False를 반환합니다.
    - 시간대(KST)를 고려하여 두 시간의 절대적인 차이를 비교합니다.
    """
    if not history_dt_utc:
        return False

    kst = pytz.timezone('Asia/Seoul')

    # history_dt가 timezone 정보가 없으면 UTC로 설정
    if history_dt_utc.tzinfo is None:
        history_dt_utc = pytz.utc.localize(history_dt_utc)

    history_dt_kst = history_dt_utc.astimezone(kst)

    # 시간 차이가 허용 범위 내에 있는지 확인
    time_diff = abs(schedule_dt_aware - history_dt_kst)
    is_within_grace = time_diff <= timedelta(minutes=grace_minutes)
    current_app.logger.debug(f"Comparing schedule {schedule_dt_aware} with history {history_dt_kst}. "
                         f"Time diff: {time_diff}, Grace period: {grace_minutes} mins. Match: {is_within_grace}")
    return is_within_grace

def naive_to_utc(dt: datetime) -> datetime:
    """
    timezone 정보가 없는 datetime을 UTC로 변환합니다.

    Args:
        dt: naive datetime 객체

    Returns:
        UTC timezone이 적용된 datetime 객체
    """
    if dt.tzinfo is None:
        return pytz.utc.localize(dt)
    return dt

def utc_to_kst_str(dt: datetime) -> str:
    """
    UTC datetime을 KST 문자열로 변환합니다.

    Args:
        dt: UTC datetime 객체 (naive일 경우 UTC로 간주)

    Returns:
        KST 시간대의 'YYYY-MM-DD HH:MM:SS' 형식 문자열
    """
    kst = pytz.timezone('Asia/Seoul')
    utc = pytz.utc

    if dt.tzinfo is None:
        dt = utc.localize(dt)

    return dt.astimezone(kst).strftime('%Y-%m-%d %H:%M:%S')

def get_kst_now() -> datetime:
    """
    현재 KST 시간을 반환합니다.

    Returns:
        KST timezone이 적용된 현재 datetime 객체
    """
    kst = pytz.timezone('Asia/Seoul')
    return datetime.now(kst)

def convert_datetime_fields_to_kst_str(data: Any) -> Any:
    """
    데이터의 datetime 필드들을 재귀적으로 KST 문자열로 변환합니다.
    decimal 객체는 문자열로 변환하여 정확도 보장합니다.
    변환은 in-place로 수행됩니다.

    Args:
        data: 변환할 데이터 (dict, list, 또는 기타)

    Returns:
        변환된 데이터
    """
    import decimal
    kst = pytz.timezone('Asia/Seoul')
    utc = pytz.utc

    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                if value.tzinfo is None:
                    value = utc.localize(value)
                data[key] = value.astimezone(kst).strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(value, decimal.Decimal):
                data[key] = str(value)  # 정확도 보장을 위해 문자열로 변환
            elif value is None:
                data[key] = ''  # None을 빈 문자열로 변환
            else:
                # 재귀적으로 처리
                convert_datetime_fields_to_kst_str(value)
    elif isinstance(data, list):
        for item in data:
            convert_datetime_fields_to_kst_str(item)
    # 기타 타입은 그대로 반환

    return data
