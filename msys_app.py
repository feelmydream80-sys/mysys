#
# 주요 역할: Flask 애플리케이션의 메인 파일로, 라우팅, 서비스 계층 호출, 데이터베이스 연결 관리 등을 담당합니다.

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, g, flash
from flask_cors import CORS
from flasgger import Swagger
from flask_login import LoginManager
import logging
import logging.handlers
import sys
from datetime import datetime, timedelta, date
import decimal  # Decimal도 처리하려면
import json
import os

from routes import init_app as init_routes
from msys.database import close_db_connection, init_db_pool
from routes.admin_routes import admin_bp
from utils.logging_config import setup_logging
from utils.auth_middleware import setup_auth_middleware
from config import config

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    class CustomJSONEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()  # "2025-12-16T10:30:00" 또는 "2025-12-16" 형식
            if isinstance(obj, decimal.Decimal):
                return str(obj)  # 정확도 100% 보장을 위해 문자열로 변환
            # 필요시 다른 타입 추가 (예: bytes, set 등)
            try:
                return super().default(obj)
            except TypeError:
                return str(obj)  # 최후의 안전장치
    
    app.json_encoder = CustomJSONEncoder  # ← 이 한 줄 추가!   
    CORS(app)
    Swagger(app)

    # DB 커넥션 풀 초기화
    init_db_pool()

    from models.user import User

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    @login_manager.user_loader
    def load_user(user_id):
        from msys.database import get_db_connection
        from service.auth_service import AuthService
        from models.user import User
        
        conn = get_db_connection()
        auth_service = AuthService(conn)
        user_info = auth_service.get_user_by_id(user_id)
        if user_info:
            # 'permissions' 키가 없을 경우를 대비하여 기본값으로 빈 리스트를 사용
            permissions = user_info.get('permissions', [])
            return User(user_id=user_info['user_id'], permissions=permissions)
        return None

    # 세션 사용을 위한 시크릿 키 설정
    app.secret_key = config.SECRET_KEY
    app.config['PERMANENT_SESSION_LIFETIME'] = config.get_permanent_session_lifetime()

    # 로깅 설정
    setup_logging(app, config.DEBUG)

    # 애플리케이션 컨텍스트 내에서 DB 매핑 정보 및 메뉴 데이터 초기화
    with app.app_context():
        from msys.column_mapper import column_mapper
        from msys.database import get_db_connection
        from service.mngr_sett_service import MngrSettService
        
        # DB 매핑 정보 초기화
        try:
            conn = get_db_connection()
            column_mapper.init_db_mappings(conn)
        except Exception as e:
            app.logger.error(f"🔥 Failed to initialize ColumnMapper DB mappings: {e}")

        # 메뉴 데이터 캐싱
        try:
            conn = get_db_connection()
            service = MngrSettService(conn)
            app.menu_items = service.get_menu_settings()
            app.logger.info("메뉴 데이터가 성공적으로 캐싱되었습니다.")
        except Exception as e:
            app.logger.error(f"메뉴 데이터 캐싱 실패: {e}")
            app.menu_items = []

    # 블루프린트 초기화
    init_routes(app)

    @app.route('/')
    def index():
        # 이 라우트는 다른 블루프린트가 모두 등록된 후에 정의되어야
        # url_for가 엔드포인트를 올바르게 찾을 수 있습니다.
        return redirect(url_for('dashboard.dashboard'))

    # 요청 종료 시 DB 연결을 닫는 핸들러 등록
    app.teardown_appcontext(close_db_connection)

    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}

    @app.context_processor
    def inject_menu():
        # 앱 컨텍스트에 캐시된 메뉴 데이터를 사용
        return {'menu_items': app.menu_items}

    @app.context_processor
    def inject_contact_info():
        return {'contact_info': config.CONTACT_INFO}

    # 인증 미들웨어 설정
    setup_auth_middleware(app, config.AUTH_ENABLED)

    return app

if __name__ == '__main__':
    app = create_app()
    app.logger.info(f" * Running on http://{config.HOST}:{config.PORT}")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
