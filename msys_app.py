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
import threading
import time

from routes import init_app as init_routes
from msys.database import close_db_connection, init_db_pool
from routes.admin_routes import admin_bp
from utils.logging_config import setup_logging
from utils.auth_middleware import setup_auth_middleware
from config import config

# 간단한 스케줄러 (추가 설치 불필요 - threading.Timer 사용)
class SimpleScheduler:
    """Python 내장 threading.Timer를 사용한 간단한 스케줄러"""
    def __init__(self):
        self.jobs = {}
        self.running = False
    
    def add_job(self, id, func, hour=9, minute=0):
        """스케줄 작업 추가"""
        self.jobs[id] = {'func': func, 'hour': hour, 'minute': minute}
    
    def remove_job(self, id):
        """스케줄 작업 제거"""
        if id in self.jobs:
            del self.jobs[id]
    
    def _calculate_next_run(self, hour, minute):
        """다음 실행 시간 계산 (초 단위)"""
        now = datetime.now()
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if target <= now:
            target = target + timedelta(days=1)
        return (target - now).total_seconds()
    
    def _run_job(self, job_id, func, hour, minute):
        """작업 실행 및 다음 실행 예약"""
        try:
            func()
        except Exception as e:
            logging.error(f"Job {job_id} failed: {e}")
        finally:
            if self.running and job_id in self.jobs:
                next_run = self._calculate_next_run(hour, minute)
                timer = threading.Timer(next_run, self._run_job, [job_id, func, hour, minute])
                timer.daemon = True
                timer.start()
    
    def start(self):
        """스케줄러 시작"""
        self.running = True
        for job_id, job in self.jobs.items():
            next_run = self._calculate_next_run(job['hour'], job['minute'])
            timer = threading.Timer(next_run, self._run_job, [job_id, job['func'], job['hour'], job['minute']])
            timer.daemon = True
            timer.start()
    
    def stop(self):
        """스케줄러 중지"""
        self.running = False

scheduler = SimpleScheduler()

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

        # 게스트 사용자 처리
        if user_id == 'guest':
            return User('guest', ['collection_schedule'])

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

        # 상태 코드 서비스 초기화
        try:
            from service.status_code_service import init_status_codes
            init_status_codes(conn)
            app.logger.info("상태 코드 서비스가 성공적으로 초기화되었습니다.")
        except Exception as e:
            app.logger.error(f"상태 코드 서비스 초기화 실패: {e}")

    # 블루프린트 초기화
    init_routes(app)

    @app.before_request
    def before_request():
        # 세션에서 사용자 정보를 g 객체에 복원
        if 'user' in session:
            g.user = session['user']

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

    # Mock HTML 파일 제공 라우트 추가
    @app.route('/data_definition_api_mock.html')
    def serve_mock_html():
        return app.send_static_file('data_definition_api_mock.html')

    return app

def init_mail_scheduler(app):
    """메일 스케줄러 초기화"""
    with app.app_context():
        try:
            from service.mail_scheduler_service import MailSchedulerService
            from dao.api_key_mngr_dao import ApiKeyMngrDao
            
            dao = ApiKeyMngrDao()
            settings = dao.select_schedule_settings()
            
            if settings and len(settings) > 0:
                schd = settings[0]
                
                if schd.get('is_active', False):
                    schd_time = schd.get('schd_time', '09:00')
                    hour, minute = map(int, schd_time.split(':'))
                    
                    target_cds = None
                    if schd.get('target_cds'):
                        target_cds = [cd.strip() for cd in schd['target_cds'].split(',')]
                    
                    exclude_cds = None
                    if schd.get('exclude_cds'):
                        exclude_cds = [cd.strip() for cd in schd['exclude_cds'].split(',')]
                    
                    def scheduled_mail_job():
                        """스케줄된 메일 발송 작업"""
                        with app.app_context():
                            app.logger.info("Starting scheduled mail job...")
                            try:
                                service = MailSchedulerService()
                                result = service.check_and_send_scheduled_mails(
                                    target_cds=target_cds,
                                    exclude_cds=exclude_cds
                                )
                                
                                success_count = len(result.get('success', []))
                                failed_count = len(result.get('failed', []))
                                app.logger.info(
                                    f"Scheduled mail job completed: "
                                    f"success={success_count}, failed={failed_count}"
                                )
                                
                                # 마지막 실행 정보 업데이트
                                dao.update_schedule_last_run(
                                    schd.get('schd_id', 1),
                                    'success' if failed_count == 0 else 'partial'
                                )
                            except Exception as e:
                                app.logger.error(f"Scheduled mail job failed: {e}")
                                try:
                                    dao.update_schedule_last_run(schd.get('schd_id', 1), 'failed')
                                except:
                                    pass
                    
                    # 기존 작업 제거 후 새 작업 추가
                    try:
                        scheduler.remove_job('daily_mail_send')
                    except:
                        pass
                    
                    scheduler.add_job(
                        id='daily_mail_send',
                        func=scheduled_mail_job,
                        hour=hour,
                        minute=minute
                    )
                    
                    app.logger.info(f"Mail scheduler initialized: {hour:02d}:{minute:02d}")
                else:
                    app.logger.info("Mail scheduler is disabled")
            else:
                app.logger.info("No schedule settings found")
        except Exception as e:
            app.logger.error(f"Failed to initialize mail scheduler: {e}")

if __name__ == '__main__':
    app = create_app()
    
    # 스케줄러 초기화 (추가 설치 불필요)
    init_mail_scheduler(app)
    scheduler.start()
    
    app.logger.info(f" * Running on http://{config.HOST}:{config.PORT}")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
