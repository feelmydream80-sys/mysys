# routes/auth_routes.py
from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template, flash, current_app, make_response
from flask_login import login_user, login_required, logout_user
from functools import wraps
import os
from datetime import datetime, timedelta
from msys.database import get_db_connection
from service.auth_service import AuthService
from service.password_service import PasswordService
from mapper.user_mapper import UserMapper
from service.dashboard_service import DashboardService

auth_bp = Blueprint('auth', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        current_app.logger.info(f"--- [DEBUG] admin_required: Checking permissions. User has: {user_permissions}")
        has_permission = 'mngr_sett' in user_permissions
        current_app.logger.info(f"--- [DEBUG] admin_required: Has 'mngr_sett' permission? {has_permission}")
        if not has_permission:
            current_app.logger.warning(f"--- [DEBUG] admin_required: Permission denied for user with permissions: {user_permissions}")
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def collection_schedule_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'collection_schedule' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def analysis_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'analysis' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def data_analysis_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'data_analysis' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def card_summary_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'card_summary' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def data_report_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'data_report' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def data_spec_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'data_spec' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def jandi_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'jandi' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def mapping_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'mapping' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def mngr_sett_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'mngr_sett' not in user_permissions:
            return render_template("unauthorized.html")
        return f(*args, **kwargs)
    return decorated_function

def check_password_change_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow access to change_password and logout pages
        if request.endpoint in ['auth.change_password', 'auth.logout']:
            return f(*args, **kwargs)
        
        # Bypass check for admin users
        is_admin = 'mngr_sett' in session.get('user', {}).get('permissions', [])
        if is_admin:
            return f(*args, **kwargs)
        
        if session.get('force_password_change'):
            flash("계속하려면 비밀번호를 변경해야 합니다.", "warning")
            return redirect(url_for('auth.change_password'))
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'user' in session:
        return redirect(url_for('dashboard.dashboard'))

    if request.method == 'POST':
        user_id = request.form.get('user_id')
        password = request.form.get('password')

        if not user_id or not password:
            flash("사용자 ID와 비밀번호를 모두 입력해주세요.", "error")
            return redirect(url_for('auth.login'))

        conn = get_db_connection()
        try:
            auth_service = AuthService(conn)
            dashboard_service = DashboardService(conn)
            user_info, message = auth_service.verify_user(user_id, password)

            # --- 로그인 성공/실패 로그 기록 ---
            try:
                status = 'AUTH_LOGIN_SUCCESS' if user_info else 'AUTH_LOGIN_FAIL'
                rqs_info = f"User '{user_id}' logged in successfully" if user_info else f"Failed login attempt for user '{user_id}': {message}"
                dashboard_service.save_event(con_id=None, job_id=None, status=status, rqs_info=rqs_info)
                conn.commit()
                current_app.logger.info(f"Login event saved for user '{user_id}': {status}")
            except Exception as e:
                current_app.logger.error(f"Failed to save login event log for user {user_id}: {e}")
            # --------------------------

            if user_info:
                # --- [기본 권한 추가] ---
                # 모든 승인된 사용자는 기본적으로 'dashboard'와 'collection_schedule' 조회 권한을 가집니다.
                # 이 메뉴들은 모든 사용자가 기본적으로 접근할 수 있어야 하는 핵심 기능입니다.
                permissions = user_info.get('permissions', [])
                if 'dashboard' not in permissions:
                    permissions.append('dashboard')
                if 'collection_schedule' not in permissions:
                    permissions.append('collection_schedule')
                user_info['permissions'] = permissions
                # --- [기본 권한 추가 끝] ---

                # --- [세션 초기화] ---
                # 로그인 성공 시, 이전 세션 정보를 완전히 제거하여 깨끗한 상태에서 시작합니다.
                # 이를 통해 과거의 잘못된 데이터가 남아있는 문제를 원천적으로 방지합니다.
                session.clear()
                # --- [세션 초기화 끝] ---
                
                # --- [데이터 접근 권한 세션에 추가] ---
                # 로그인 성공 시, 사용자의 데이터 접근 권한을 조회하여 세션에 추가합니다.
                # 이것이 애플리케이션 전역에서 사용될 공통 권한 정보입니다.
                try:
                    user_mapper = UserMapper(conn)
                    data_permissions = user_mapper.find_data_permissions_by_user_id(user_info['user_id'])
                    current_app.logger.info(f"DATA_PERMISSIONS_DIAGNOSIS: Fetched from DB: {data_permissions} (Type: {type(data_permissions)})")
                    
                    user_info['data_permissions'] = data_permissions
                    # 데이터가 올바르게 로드되었는지 확인하기 위한 명확한 로그 추가
                    current_app.logger.info(f"DATA_PERMISSIONS_DIAGNOSIS: About to be saved to session: {user_info['data_permissions']}")
                except Exception as e:
                    current_app.logger.error(f"Failed to load data permissions for user '{user_id}': {e}", exc_info=True)
                    user_info['data_permissions'] = [] # 오류 발생 시 빈 리스트로 초기화
                # --- [데이터 접근 권한 세션에 추가 끝] ---

                # 사용자가 관리자인 경우, 'mngr_sett' 권한을 세션에 추가합니다.
                if user_info.get('is_admin'):
                    if 'permissions' not in user_info:
                        user_info['permissions'] = []
                    if 'mngr_sett' not in user_info['permissions']:
                        user_info['permissions'].append('mngr_sett')
                        current_app.logger.info(f"Admin user '{user_id}' detected. Granting 'mngr_sett' permission.")

                from models.user import User
                user = User(user_id=user_info['user_id'], permissions=user_info.get('permissions', []))
                login_user(user)
                session['user'] = user_info # 기존 세션 구조 유지를 위해 함께 사용
                
                # g 객체에도 사용자 정보를 즉시 설정하여 리다이렉트 후 바로 적용되도록 함
                from flask import g
                g.user = user_info

                # --- 세션 유지 기능 ---
                session.permanent = True
                
                # 사용자 유형에 따라 만료 시간(lifetime)을 결정
                # .env에서 일반 사용자 세션 만료 시간(분)을 읽어오고, 없으면 기본값 20분 사용
                default_session_minutes = int(os.getenv('DEFAULT_SESSION_LIFETIME_MINUTES', '20'))
                
                if 'mngr_sett' in user_info.get('permissions', []):
                    # 관리자는 앱의 PERMANENT_SESSION_LIFETIME 설정을 따름 (쿠키 최대 수명)
                    lifetime = current_app.config['PERMANENT_SESSION_LIFETIME']
                else:
                    # 일반 사용자는 .env 또는 기본값(20분)을 따름
                    lifetime = timedelta(minutes=default_session_minutes)
                
                current_app.logger.info(f"--- [DEBUG] Login successful. Session user_info: {user_info}")
                session.pop('force_password_change', None) # Clear any previous flags

                # Set session expiry time immediately upon login
                session['expiry_time'] = (datetime.utcnow() + lifetime).isoformat()

                # Check if the password is the same as the user ID (case of password reset)
                if user_id == password:
                    user_permissions = session.get('user', {}).get('permissions', [])
                    is_admin = 'mngr_sett' in user_permissions
                    # Force password change only for non-admins
                    if not is_admin:
                        session['force_password_change'] = True
                        flash("비밀번호를 변경해야 합니다. 초기화된 비밀번호는 안전하지 않습니다.", "warning")
                        return redirect(url_for('auth.change_password'))
                
                # --- 사용자의 메뉴 목록을 가져와 첫 페이지로 리디렉션 ---
                try:
                    user_mapper = UserMapper(conn)
                    user_menus = user_mapper.find_user_menus_sorted(user_id)
                    
                    if user_menus:
                        # 가장 순서가 빠른 메뉴의 URL로 리디렉션
                        first_menu_url = user_menus[0].get('menu_url')
                        if first_menu_url:
                            # menu_url은 이제 엔드포인트가 아닌 실제 경로이므로 직접 사용
                            return redirect(first_menu_url)
                        else:
                            # URL이 없는 경우에 대한 예외 처리
                            flash("접근 가능한 첫 페이지의 URL이 설정되지 않았습니다.")
                            logout_user()
                            session.clear()
                            return redirect(url_for('auth.login'))
                    else:
                        # 할당된 메뉴가 없는 경우
                        flash("접근 권한이 있는 메뉴가 없습니다. 관리자에게 문의하세요.")
                        return render_template("unauthorized.html")
                except Exception as e:
                    current_app.logger.error(f"메뉴 기반 리디렉션 처리 중 예외 발생: {e}", exc_info=True)
                    flash("로그인 후 페이지 이동 중 오류가 발생했습니다.")
                    logout_user()
                    session.clear()
                    return redirect(url_for('auth.login'))
                # ----------------------------------------------------

            else:
                flash(message, 'error')
                return redirect(url_for('auth.login'))
        except Exception as e:
            current_app.logger.error(f"로그인 처리 중 예외 발생: {e}", exc_info=True)
            flash("로그인 중 오류가 발생했습니다. 다시 시도해주세요.", "error")
            return redirect(url_for('auth.login'))
    
    # GET 요청 시 로그인 페이지 렌더링 (캐시 방지)
    response = make_response(render_template('login.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0, private'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()
    flash("로그아웃되었습니다.", "success")
    return redirect(url_for('auth.login'))

@auth_bp.route('/register', methods=['POST'])
def register():
    user_id = request.form.get('user_id')
    password = request.form.get('password')
    password_confirm = request.form.get('password_confirm')

    if not all([user_id, password, password_confirm]):
        current_app.logger.warning(f"회원가입 실패: 필수 필드 누락 (user_id: {user_id})")
        flash("모든 필드를 입력해주세요.")
        return redirect(url_for('auth.login'))

    if password != password_confirm:
        current_app.logger.warning(f"회원가입 실패: 비밀번호 불일치 (user_id: {user_id})")
        flash("비밀번호가 일치하지 않습니다.")
        return redirect(url_for('auth.login'))

    # is_valid, message = PasswordService.validate_password_policy(password)
    # if not is_valid:
    #     current_app.logger.warning(f"회원가입 실패: 비밀번호 정책 위반 (user_id: {user_id}, message: {message})")
        flash(message)
    #     return redirect(url_for('auth.login'))

    try:
        conn = get_db_connection()
        user_mapper = UserMapper(conn)
        dashboard_service = DashboardService(conn)
        if user_mapper.find_by_id(user_id):
            current_app.logger.warning(f"회원가입 실패: 이미 존재하는 사용자 ID (user_id: {user_id})")
            flash("이미 존재하는 사용자 ID입니다.")
            return redirect(url_for('auth.login'))
        
        hashed_password = PasswordService.hash_password(password)

        user_mapper.save(user_id, hashed_password)
        current_app.logger.info(f"DB에 사용자 정보 저장 성공 (user_id: {user_id}, status: PENDING)")
        
        # --- 회원가입 신청 이벤트 로그 기록 ---
        try:
            rqs_info = f"New user registration requested: '{user_id}'"
            dashboard_service.save_event(con_id=None, job_id=None, status='AUTH_REGISTER', rqs_info=rqs_info)
            current_app.logger.info(f"Registration event saved for user: {user_id}")
        except Exception as log_e:
            current_app.logger.error(f"Failed to save registration event log for user {user_id}: {log_e}")
        # ---------------------------------
        conn.commit()
        flash("회원가입 신청이 완료되었습니다. 관리자의 승인을 기다려주세요.", "success")
    except Exception as e:
        conn.rollback()
        current_app.logger.error(f"회원가입 처리 중 예외 발생 (user_id: {user_id}): {e}", exc_info=True)
        flash(f"회원가입 중 오류가 발생했습니다: {e}")

    return redirect(url_for('auth.login'))

@auth_bp.route('/change_password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        user_id = session['user']['user_id']

        if not all([current_password, new_password, confirm_password]):
            flash("모든 필드를 입력해주세요.")
            return redirect(url_for('auth.change_password'))

        if new_password != confirm_password:
            flash("새 비밀번호가 일치하지 않습니다.")
            return redirect(url_for('auth.change_password'))

        try:
            conn = get_db_connection()
            auth_service = AuthService(conn)
            dashboard_service = DashboardService(conn)

            # 관리자인지 확인
            is_admin = 'mngr_sett' in session.get('user', {}).get('permissions', [])

            # 관리자가 아닌 경우에만 비밀번호 정책 검사
            if not is_admin:
                is_valid, message = PasswordService.validate_password_policy(new_password)
                if not is_valid:
                    flash(message)
                    return redirect(url_for('auth.change_password'))

            # 비밀번호 변경 서비스 호출
            success, message = auth_service.change_password(user_id, current_password, new_password)
            if not success:
                flash(message)
                return redirect(url_for('auth.change_password'))

            # --- 비밀번호 변경 이벤트 로그 기록 ---
            try:
                rqs_info = f"User '{user_id}' changed their password"
                dashboard_service.save_event(con_id=None, job_id=None, status='AUTH_CHANGE_PW', rqs_info=rqs_info)
                current_app.logger.info(f"Password change event saved for user: {user_id}")
            except Exception as log_e:
                current_app.logger.error(f"Failed to save password change event log for user {user_id}: {log_e}")
            # ------------------------------------
            conn.commit()

            # Clear the force_password_change flag from the session
            session.pop('force_password_change', None)

            flash("비밀번호가 성공적으로 변경되었습니다.", "success")
            return redirect(url_for('dashboard.dashboard')) # Redirect to dashboard after successful change

        except Exception as e:
            conn.rollback()
            current_app.logger.error(f"비밀번호 변경 중 오류 발생 (user_id: {user_id}): {e}", exc_info=True)
            flash("비밀번호 변경 중 오류가 발생했습니다.")

    # GET 요청 시 비밀번호 변경 페이지 렌더링 (캐시 방지)
    response = make_response(render_template('change_password.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0, private'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@auth_bp.route('/request-reset-password', methods=['POST'])
def request_reset_password():
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "사용자 ID를 입력해주세요."}), 400

    try:
        conn = get_db_connection()
        user_mapper = UserMapper(conn)
        dashboard_service = DashboardService(conn)
        user = user_mapper.find_by_id(user_id)
        if not user:
            return jsonify({"success": False, "message": "존재하지 않는 사용자입니다."}), 404
        
        # 사용자를 'PENDING_RESET' 상태로 변경합니다.
        user_mapper.update_status(user_id, 'PENDING_RESET')

        # --- 비밀번호 초기화 요청 이벤트 로그 기록 ---
        try:
            rqs_info = f"User '{user_id}' requested password reset"
            dashboard_service.save_event(con_id=None, job_id=None, status='AUTH_REQUEST_PW_RESET', rqs_info=rqs_info)
            current_app.logger.info(f"Password reset request event saved for user: {user_id}")
        except Exception as log_e:
            current_app.logger.error(f"Failed to save password reset request event log for user {user_id}: {log_e}")
        # ------------------------------------
        conn.commit()
            
        return jsonify({"success": True, "message": "비밀번호 초기화가 요청되었습니다. 관리자에게 문의하세요."})
    except Exception as e:
        conn.rollback()
        current_app.logger.error(f"비밀번호 초기화 요청 처리 중 오류 발생 (user_id: {user_id}): {e}", exc_info=True)
        return jsonify({"success": False, "message": "요청 처리 중 오류가 발생했습니다."}), 500
