import logging
import logging.handlers
import sys
import os
from flask import request, current_app
from config import config

def log_operation(menu: str, function: str, operation: str, result: str, level: str = "INFO", details: dict = None):
    """
    표준화된 포맷으로 로깅합니다.
    포맷: [메뉴]-[기능]-[작업]-[결과]

    Args:
        menu: 메뉴 이름 (예: "분석", "대시보드")
        function: 기능 이름 (예: "차트 조회", "데이터 필터링")
        operation: 작업 내용 (예: "성공률 추이 데이터", "권한 검증")
        result: 결과 요약 (예: "200건 반환", "권한 부족", "처리 완료")
        level: 로그 레벨 ("DEBUG", "INFO", "WARNING", "ERROR")
        details: 추가 상세 정보 (디버그 모드에서만 출력)
    """
    from config import config

    # 디버그 모드가 아니고 DEBUG 레벨이면 로깅하지 않음
    if not config.DEBUG and level == "DEBUG":
        return

    # 표준 포맷 생성
    message = f"[{menu}]-[{function}]-[{operation}]-[{result}]"

    # 디버그 모드에서만 상세 정보 추가
    if details and config.DEBUG:
        detail_str = ", ".join(f"{k}={v}" for k, v in details.items())
        message += f" | {detail_str}"

    # 로깅 실행
    logger = logging.getLogger()
    if level == "DEBUG":
        logger.debug(message)
    elif level == "INFO":
        logger.info(message)
    elif level == "WARNING":
        logger.warning(message)
    elif level == "ERROR":
        logger.error(message)
    else:
        logger.info(message)  # 기본값

def setup_logging(app, debug_mode=False):
    """
    애플리케이션 로깅을 설정합니다.

    Args:
        app: Flask 애플리케이션 인스턴스
        debug_mode: 디버그 모드 여부 (True: 콘솔 로깅, False: 파일 로깅)
    """
    log_level = logging.DEBUG if debug_mode else logging.INFO

    # IP 주소를 로그에 추가하기 위한 필터
    class RequestContextFilter(logging.Filter):
        def filter(self, record):
            record.remote_addr = request.remote_addr if request else 'N/A'
            return True

    app_log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(remote_addr)s - %(filename)s:%(lineno)d - %(message)s')
    root_logger = logging.getLogger()

    # 기존 핸들러 제거 (중복 출력 방지)
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    root_logger.setLevel(log_level)

    # --- 항상 파일 로깅 활성화 ---
    log_dir = config.LOG_DIR
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # 애플리케이션 로그 파일 핸들러
    app_file_handler = logging.handlers.TimedRotatingFileHandler(
        filename=os.path.join(log_dir, 'app.log'), when='midnight', backupCount=30, encoding='utf-8'
    )
    app_file_handler.setFormatter(app_log_formatter)
    app_file_handler.addFilter(RequestContextFilter())
    root_logger.addHandler(app_file_handler)

    # Werkzeug (Access) 로그 파일 핸들러
    werkzeug_logger = logging.getLogger('werkzeug')
    werkzeug_logger.setLevel(logging.INFO)
    werkzeug_log_formatter = logging.Formatter('%(asctime)s - %(message)s')
    werkzeug_file_handler = logging.handlers.TimedRotatingFileHandler(
        filename=os.path.join(log_dir, 'access.log'), when='midnight', backupCount=30, encoding='utf-8'
    )
    werkzeug_file_handler.setFormatter(werkzeug_log_formatter)
    werkzeug_logger.addHandler(werkzeug_file_handler)
    werkzeug_logger.propagate = False

    if debug_mode:
        # --- 디버그 모드: 추가로 콘솔 로깅 ---
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(app_log_formatter)
        console_handler.addFilter(RequestContextFilter())
        root_logger.addHandler(console_handler)

        # Werkzeug 로거도 콘솔에 출력하도록 설정
        werkzeug_logger.addHandler(console_handler)

        app.logger.info("로깅 시스템이 [파일 + 콘솔 로깅]으로 초기화되었습니다. (디버그 모드)")
    else:
        app.logger.info("로깅 시스템이 [파일 로깅]으로 초기화되었습니다. (운영 모드)")
