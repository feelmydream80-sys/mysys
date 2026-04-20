"""
Job 유틸리티 모듈
Job ID 관련 공통 기능 제공
"""
import re


def should_exclude_job(job_id):
    """
    100단위 및 CD900~CD999 제외 여부 확인
    - CD100, CD200, CD300, CD400 등 100단위 제외
    - CD900~CD999 범위 제외
    
    Args:
        job_id: Job ID 문자열 (예: 'CD400')
        
    Returns:
        bool: 제외해야 하면 True, 아니면 False
    """
    if not job_id:
        return True
    
    job_id = str(job_id).upper().strip()
    
    # CD 패턴 매칭
    match = re.match(r'CD(\d+)', job_id)
    if match:
        cd_number = int(match.group(1))
        # CD900~CD999 또는 100단위 제외
        return (900 <= cd_number <= 999) or (cd_number % 100 == 0)
    
    return False
