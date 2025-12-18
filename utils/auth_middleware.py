from flask import g, session, redirect, url_for, flash, request, jsonify, render_template
from datetime import datetime
import os
from utils.logging_config import log_operation

# 메뉴 권한 매핑: 엔드포인트 -> 필요한 권한
MENU_PERMISSION_MAPPING = {
    # Analysis 메뉴
    'analysis.chart_analysis': 'chart_analysis',
    'analysis.data_analysis': 'data_analysis',

    # Dashboard 메뉴
    'dashboard.dashboard': 'dashboard',

    # Collection Schedule 메뉴
    'collection_schedule.collection_schedule': 'collection_schedule',

    # Card Summary 메뉴
    'card_summary.card_summary_page': 'card_summary',

    # Manager Settings 메뉴 (관리자 권한)
    'mngr_sett.mngr_sett_page': 'mngr_sett',

    # Data Spec 메뉴
    'data_spec.data_spec_page': 'data_spec',

    # Jandi 메뉴
    'jandi.jandi_page': 'jandi',

    # Mapping 메뉴
    'mapping.index': 'mapping',

    # Data Report 메뉴
    'data_report.data_report_page': 'data_report',
}

def setup_auth_middleware(app, auth_enabled=True):
    """
    인증 미들웨어를 설정합니다.

    Args:
        app: Flask 애플리케이션 인스턴스
        auth_enabled: 인증 활성화 여부
    """
    @app.before_request
    def check_auth():
        # 정적 파일 요청에 대한 로그는 생략하여 로그를 깔끔하게 유지
        if request.path.startswith('/static'):
            return

        log_operation("인증", "요청 검증", "권한 체크", f"{request.method} {request.path}")

        # 세션을 영구 세션으로 설정. PERMANENT_SESSION_LIFETIME에 설정된 시간 후에 만료됩니다.
        session.permanent = True

        if not auth_enabled:
            g.user = None
            log_operation("인증", "시스템 설정", "인증 비활성화", "체크 생략")
            return

        g.user = session.get('user', None)
        user_status = "로그인됨" if g.user else "미로그인"
        log_operation("인증", "세션 확인", "사용자 상태", user_status)

        # Sliding Session: Update expiry time on each request if user is logged in
        if g.user:
            expiry_time_str = session.get('expiry_time')
            log_operation("인증", "세션 검증", "만료 시간 확인", "존재함" if expiry_time_str else "없음")

            # expiry_time이 없는 구형 세션은 강제 로그아웃
            if not expiry_time_str:
                session.clear()
                g.user = None
                flash("비정상적인 세션이 감지되어 로그아웃되었습니다. 다시 로그인해주세요.", "warning")
                log_operation("인증", "세션 검증", "만료 시간 누락", "강제 로그아웃", "WARNING")
                return redirect(url_for('auth.login'))

            try:
                expiry_time = datetime.fromisoformat(expiry_time_str)
                now = datetime.utcnow()
                is_expired = now > expiry_time
                expiry_status = "만료됨" if is_expired else "유효함"
                log_operation("인증", "세션 검증", "만료 상태 체크", expiry_status)

                if is_expired:
                    session.clear()
                    g.user = None
                    log_operation("인증", "세션 관리", "만료 처리", "세션 정리")

                    # API 요청에 대해서는 JSON 응답, 그 외에는 로그인 페이지로 리디렉션
                    if request.path.startswith('/api/'):
                        log_operation("인증", "API 접근", "세션 만료", "401 반환", "WARNING")
                        return jsonify({"error": "Session expired"}), 401

                    flash("세션이 만료되었습니다. 다시 로그인해주세요.", "warning")
                    log_operation("인증", "페이지 리다이렉트", "로그인 페이지", "세션 만료")
                    return redirect(url_for('auth.login'))
            except ValueError:
                log_operation("인증", "세션 검증", "시간 형식 오류", "강제 로그아웃", "WARNING")
                session.clear()
                g.user = None
                flash("비정상적인 세션이 감지되어 로그아웃되었습니다. 다시 로그인해주세요.", "warning")
                return redirect(url_for('auth.login'))

            # 세션 만료 시간 갱신 로직 비활성화
            # new_expiry_time = (datetime.utcnow() + app.config['PERMANENT_SESSION_LIFETIME']).isoformat()
            # session['expiry_time'] = new_expiry_time
            # app.logger.info(f"--- [AUTH] Session expiry time refreshed to: {new_expiry_time}")

        if g.user and not g.user.get('user_id'):
            session.clear()
            g.user = None
            flash("비정상적인 세션이 감지되어 로그아웃되었습니다. 다시 로그인해주세요.", "warning")
            log_operation("인증", "세션 검증", "사용자 ID 누락", "강제 로그아웃", "WARNING")
            return redirect(url_for('auth.login'))

        excluded_endpoints = ['auth.login', 'auth.logout', 'auth.register', 'auth.request_reset_password', 'static', 'index']

        if g.user:
            log_operation("인증", "권한 체크", "메뉴 접근", f"경로: {request.path}")

            # 메뉴 권한 체크
            endpoint = request.endpoint
            if endpoint in MENU_PERMISSION_MAPPING:
                required_permission = MENU_PERMISSION_MAPPING[endpoint]
                user_permissions = g.user.get('permissions', [])
                user_id = g.user.get('user_id', 'Unknown')

                if required_permission not in user_permissions:
                    log_operation("인증", "권한 체크", "접근 거부", f"사용자: {user_id}, 필요 권한: {required_permission}", "WARNING")
                    if request.path.startswith('/api/'):
                        return jsonify({"error": f"권한이 없습니다: {required_permission}"}), 403
                    else:
                        return render_template("unauthorized.html")

            log_operation("인증", "권한 체크", "접근 승인", "통과")
            return

        endpoint_status = "제외 엔드포인트" if request.endpoint in excluded_endpoints else "인증 필요"
        log_operation("인증", "접근 제어", "엔드포인트 검증", endpoint_status)

        if request.endpoint in excluded_endpoints:
            log_operation("인증", "접근 허용", "제외 엔드포인트", "통과")
            return

        if request.path.startswith('/api/'):
            log_operation("인증", "API 접근", "미인증 요청", "401 반환", "WARNING")
            return jsonify({"error": "Authentication required"}), 401

        flash("로그인이 필요합니다.")
        log_operation("인증", "페이지 리다이렉트", "로그인 페이지", "인증 필요")
        return redirect(url_for('auth.login'))
