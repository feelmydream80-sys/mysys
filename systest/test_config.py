"""
시스템 테스트 설정 파일
"""

import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 테스트 기본 설정
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:18080/")
TEST_USER_ID = os.getenv("TEST_USER_ID", "test3")
TEST_USER_PASSWORD = os.getenv("TEST_USER_PASSWORD", "test3test3!")
ADMIN_USER_ID = os.getenv("ADMIN_USER_ID", "admin")
ADMIN_USER_PASSWORD = os.getenv("ADMIN_USER_PASSWORD", "admin")

# 브라우저 설정
BROWSER = "chrome"  # chrome, firefox, edge
HEADLESS = False  # True: 브라우저 창 안보이게 실행, False: 브라우저 창 보이게 실행
IMPLICIT_WAIT = 5  # 암묵적 대기 시간 (초)
EXPLICIT_WAIT = 10  # 명시적 대기 시간 (초)

# 테스트 결과 저장 경로
REPORT_DIR = os.path.join(os.path.dirname(__file__), "reports")
SCREENSHOT_DIR = os.path.join(REPORT_DIR, "screenshots")
LOG_DIR = os.path.join(REPORT_DIR, "logs")

# 테스트 실행 설정
MAX_RETRY_COUNT = 2  # 실패시 재시도 횟수
TEST_TIMEOUT = 300  # 각 테스트 케이스 타임아웃 (초)

# 데이터베이스 설정 (테스트용)
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": os.getenv("DB_PORT")
}

# 테스트 대상 페이지 URL
PAGES = {
    "dashboard": f"{BASE_URL}dashboard",
    "admin": f"{BASE_URL}admin",
    "chart_analysis": f"{BASE_URL}chart_analysis",
    "data_analysis": f"{BASE_URL}data_analysis",
    "data_spec": f"{BASE_URL}data_spec",
    "raw_data": f"{BASE_URL}raw_data",
    "jandi": f"{BASE_URL}jandi",
    "api_test": f"{BASE_URL}api_test"
}

# API 엔드포인트
API_ENDPOINTS = {
    "dashboard_summary": f"{BASE_URL}api/dashboard/summary",
    "admin_settings": f"{BASE_URL}api/admin/settings/all",
    "analytics_trend": f"{BASE_URL}api/analytics/success_rate_trend",
    "data_spec": f"{BASE_URL}api/data-spec",
    "raw_data": f"{BASE_URL}api/raw_data",
    "jandi_data": f"{BASE_URL}api/jandi-data"
}

# 테스트 데이터
TEST_DATA = {
    "test_user": {
        "user_id": TEST_USER_ID,
        "password": TEST_USER_PASSWORD,
        "permissions": ["dashboard", "collection_schedule"]
    },
    "admin_user": {
        "user_id": ADMIN_USER_ID,
        "password": ADMIN_USER_PASSWORD,
        "permissions": ["mngr_sett", "dashboard", "collection_schedule"]
    },
    "test_job": {
        "job_id": "TEST_JOB_01",
        "job_name": "테스트 Job"
    },
    "date_range": {
        "start_date": "2023-01-01",
        "end_date": "2023-01-31"
    }
}

# 합/불 판정 기준
PASS_CRITERIA = {
    "page_load_time": 5,  # 페이지 로딩 시간 (초)
    "api_response_time": 2,  # API 응답 시간 (초)
    "success_rate": 95,  # 성공률 (%)
    "error_count": 0  # 오류 건수
}