from flask import Blueprint, render_template, current_app, request, jsonify, session, g
from ..auth_routes import login_required, check_password_change_required, collection_schedule_required
from .dashboard_routes import log_menu_access
from msys.database import get_db_connection
from datetime import datetime, timedelta, date
from typing import Optional, Dict
import pytz
from service.mngr_sett_service import MngrSettService
from service.collection_schedule_service import CollectionScheduleService

collection_schedule_bp = Blueprint('collection_schedule', __name__)

@collection_schedule_bp.route("/collection_schedule")
@login_required
@check_password_change_required
@log_menu_access
def collection_schedule():
    """데이터 수집 일정 페이지를 렌더링합니다."""
    from flask_login import current_user
    current_app.logger.info("=== COLLECTION_SCHEDULE PAGE ACCESS ===")
    current_app.logger.info(f"current_user: id={current_user.id if current_user else None}, is_authenticated={current_user.is_authenticated if current_user else False}")
    current_app.logger.info(f"session user: {session.get('user')}")
    current_app.logger.info(f"g.user: {getattr(g, 'user', None)}")
    current_app.logger.info("로그인 체크 통과, collection_schedule.html 렌더링")
    return render_template("collection_schedule.html")


@collection_schedule_bp.route("/api/collection_schedule")
@login_required
def api_collection_schedule():
    """데이터 수집 일정 데이터를 API로 제공합니다."""
    from flask_login import current_user
    current_app.logger.info("=== COLLECTION_SCHEDULE API ACCESS ===")
    current_app.logger.info(f"current_user: id={current_user.id if current_user else None}, is_authenticated={current_user.is_authenticated if current_user else False}")
    current_app.logger.info(f"session user: {session.get('user')}")
    current_app.logger.info(f"g.user: {getattr(g, 'user', None)}")

    user = session.get('user')
    view_type = request.args.get('view', 'weekly')
    month_offset = int(request.args.get('month_offset', 0))
    week_offset = int(request.args.get('week_offset', 0))
    current_app.logger.info(
        f"view_type: {view_type}, month_offset: {month_offset}, week_offset: {week_offset}, "
        f"user permissions: {user.get('permissions') if user else None}"
    )
    
    today = datetime.now(pytz.timezone('Asia/Seoul')).date()
    
    if view_type == 'monthly':
        # 기준 연/월에서 month_offset만큼 정확히 이동
        year = today.year
        month = today.month + month_offset
        # 연도/월 보정
        while month > 12:
            month -= 12
            year += 1
        while month < 1:
            month += 12
            year -= 1

        start_date = date(year, month, 1)
        # 다음 달 1일 계산 후 하루 빼서 마지막 날 계산
        next_month_year = year + (month // 12)
        next_month_month = 1 if month == 12 else month + 1
        next_month = date(next_month_year, next_month_month, 1)
        end_date = next_month - timedelta(days=1)
    else:  # weekly
        # 이번 주 월요일 기준에서 week_offset 주 만큼 이동
        start_date = today - timedelta(days=today.weekday())
        if week_offset != 0:
            start_date = start_date + timedelta(weeks=week_offset)
        end_date = start_date + timedelta(days=6)
        
    try:
        with get_db_connection() as db_connection:
            mngr_sett_service = MngrSettService(db_connection)
            collection_schedule_service = CollectionScheduleService(db_connection)
            display_settings = mngr_sett_service.get_schedule_settings_service()
            current_app.logger.info(f"DEBUG_ICON_CHECK: Fetched display_settings from service: {display_settings}")
            
            report_data = collection_schedule_service.get_schedule_only(start_date, end_date, user)
            
            status_codes = mngr_sett_service.get_status_codes_service()
        
        response_data = {
            "schedule_data": report_data,
            "display_settings": display_settings,
            "status_codes": status_codes
        }
        
        current_app.logger.info(f"DEBUG_ICON_CHECK: Final response_data to be sent: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        current_app.logger.error(f"Failed to get data report: {e}", exc_info=True)
        return jsonify({"error": "데이터를 조회하는 중 오류가 발생했습니다."}), 500
