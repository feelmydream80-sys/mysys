"""
KST (Korea Standard Time) 유틸리티 모듈
JavaScript dateUtils.js의 로직을 Python으로 포팅
"""
from datetime import datetime, timedelta
import pytz

KST_OFFSET_HOURS = 9
KST_TZ = pytz.timezone('Asia/Seoul')
UTC_TZ = pytz.UTC


def get_kst_now():
    """
    현재 시간을 KST 기준으로 반환합니다.
    dateUtils.js의 getKSTNow() 함수 포팅
    
    Returns:
        datetime: KST 타임존이 적용된 현재 시간
    """
    utc_now = datetime.now(UTC_TZ)
    return utc_now.astimezone(KST_TZ)


def format_date(dt):
    """
    datetime 객체를 YYYY-MM-DD 형식의 문자열로 변환합니다.
    dateUtils.js의 formatDate() 함수 포팅
    
    Args:
        dt: datetime 객체
        
    Returns:
        str: YYYY-MM-DD 형식의 날짜 문자열
    """
    return dt.strftime('%Y-%m-%d')


def utc_to_kst(utc_dt):
    """
    UTC datetime을 KST datetime으로 변환합니다.
    
    Args:
        utc_dt: UTC 타임존의 datetime 객체 (timezone-aware)
        
    Returns:
        datetime: KST 타임존의 datetime 객체
    """
    if utc_dt.tzinfo is None:
        utc_dt = UTC_TZ.localize(utc_dt)
    return utc_dt.astimezone(KST_TZ)


def utc_to_kst_date_str(utc_dt):
    """
    UTC datetime을 KST 기준 날짜 문자열(YYYY-MM-DD)로 변환합니다.
    문자열 입력도 처리 가능합니다.
    
    Args:
        utc_dt: UTC 타임존의 datetime 객체 또는 ISO 형식 문자열
        
    Returns:
        str: KST 기준 YYYY-MM-DD 날짜 문자열
    """
    # 문자열이면 datetime으로 파싱
    if isinstance(utc_dt, str):
        utc_dt = parse_datetime_to_kst(utc_dt)
    
    if isinstance(utc_dt, datetime):
        kst_dt = utc_to_kst(utc_dt)
        return format_date(kst_dt)
    
    # 파싱 실패 시 원본 반환
    return str(utc_dt)


def parse_datetime_to_kst(datetime_str):
    """
    ISO 형식의 datetime 문자열을 KST datetime으로 변환합니다.
    예: "2026-04-17 05:00:09+09" → KST datetime
    
    Args:
        datetime_str: ISO 형식의 datetime 문자열
        
    Returns:
        datetime: KST 타임존의 datetime 객체
    """
    # +09:00 형식 처리
    if '+09' in datetime_str and '+09:00' not in datetime_str:
        datetime_str = datetime_str.replace('+09', '+09:00')
    
    try:
        dt = datetime.fromisoformat(datetime_str)
        if dt.tzinfo is None:
            # 타임존 정보 없으면 KST로 가정
            dt = KST_TZ.localize(dt)
        return dt.astimezone(KST_TZ)
    except (ValueError, AttributeError):
        # 파싱 실패 시 원본 반환 (호환성 유지)
        return datetime_str
