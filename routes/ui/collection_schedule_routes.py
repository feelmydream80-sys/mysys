from flask import Blueprint, render_template, current_app, request, jsonify, session, g
from ..auth_routes import login_required, check_password_change_required, collection_schedule_required
from .dashboard_routes import log_menu_access
from msys.database import get_db_connection
from datetime import datetime, timedelta, date
from typing import Optional, Dict
import pytz
from service.mngr_sett_service import MngrSettService
from service.collection_schedule_service import CollectionScheduleService
from mapper.grp_memo_mapper import GrpMemoMapper

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


@collection_schedule_bp.route("/api/group-memo", methods=['GET'])
@login_required
def get_group_memo():
    """그룹 메모를 조회합니다."""
    grp_id = request.args.get('grp_id')
    depth = int(request.args.get('depth', 1))
    memo_date = request.args.get('memo_date')

    if not grp_id or not memo_date:
        return jsonify({"error": "grp_id와 memo_date는 필수입니다."}), 400

    try:
        with get_db_connection() as db_connection:
            grp_memo_mapper = GrpMemoMapper(db_connection)
            memo = grp_memo_mapper.get_memo(grp_id, depth, memo_date)
        return jsonify({"memo": memo})
    except Exception as e:
        current_app.logger.error(f"Failed to get group memo: {e}", exc_info=True)
        return jsonify({"error": "메모 조회 중 오류가 발생했습니다."}), 500


@collection_schedule_bp.route("/api/group-memo", methods=['POST'])
@login_required
def create_group_memo():
    """그룹 메모를 생성합니다 (관리자만 가능)."""
    user = session.get('user')
    if 'mngr_sett' not in user.get('permissions', []):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403

    data = request.get_json()
    grp_id = data.get('grp_id')
    depth = int(data.get('depth', 1))
    memo_date = data.get('memo_date')
    content = data.get('content')

    if not grp_id or not memo_date or content is None:
        return jsonify({"error": "grp_id, memo_date, content는 필수입니다."}), 400

    try:
        with get_db_connection() as db_connection:
            grp_memo_mapper = GrpMemoMapper(db_connection)
            existing = grp_memo_mapper.get_memo(grp_id, depth, memo_date)
            if existing:
                grp_memo_mapper.update_memo(grp_id, depth, memo_date, content, user['user_id'])
            else:
                grp_memo_mapper.insert_memo(grp_id, depth, memo_date, content, user['user_id'])
        return jsonify({"success": True})
    except Exception as e:
        current_app.logger.error(f"Failed to create/update group memo: {e}", exc_info=True)
        return jsonify({"error": "메모 저장 중 오류가 발생했습니다."}), 500


@collection_schedule_bp.route("/api/group-memo", methods=['PUT'])
@login_required
def update_group_memo():
    """그룹 메모를 수정합니다 (관리자만 가능)."""
    user = session.get('user')
    if 'mngr_sett' not in user.get('permissions', []):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403

    data = request.get_json()
    grp_id = data.get('grp_id')
    depth = int(data.get('depth', 1))
    memo_date = data.get('memo_date')
    content = data.get('content')

    if not grp_id or not memo_date or content is None:
        return jsonify({"error": "grp_id, memo_date, content는 필수입니다."}), 400

    try:
        with get_db_connection() as db_connection:
            grp_memo_mapper = GrpMemoMapper(db_connection)
            grp_memo_mapper.update_memo(grp_id, depth, memo_date, content, user['user_id'])
        return jsonify({"success": True})
    except Exception as e:
        current_app.logger.error(f"Failed to update group memo: {e}", exc_info=True)
        return jsonify({"error": "메모 수정 중 오류가 발생했습니다."}), 500


@collection_schedule_bp.route("/api/group-memo", methods=['DELETE'])
@login_required
def delete_group_memo():
    """그룹 메모를 삭제합니다 (관리자만 가능)."""
    user = session.get('user')
    if 'mngr_sett' not in user.get('permissions', []):
        return jsonify({"error": "관리자 권한이 필요합니다."}), 403

    grp_id = request.args.get('grp_id')
    depth = int(request.args.get('depth', 1))
    memo_date = request.args.get('memo_date')

    if not grp_id or not memo_date:
        return jsonify({"error": "grp_id와 memo_date는 필수입니다."}), 400

    try:
        with get_db_connection() as db_connection:
            grp_memo_mapper = GrpMemoMapper(db_connection)
            grp_memo_mapper.delete_memo(grp_id, depth, memo_date)
        return jsonify({"success": True})
    except Exception as e:
        current_app.logger.error(f"Failed to delete group memo: {e}", exc_info=True)
        return jsonify({"error": "메모 삭제 중 오류가 발생했습니다."}), 500


@collection_schedule_bp.route("/api/memos-batch", methods=['GET'])
@login_required
def get_memos_batch():
    """여러 그룹/날짜의 메모를 한 번에 조회합니다."""
    grp_ids_str = request.args.get('grp_ids', '')
    dates_str = request.args.get('dates', '')

    if not grp_ids_str or not dates_str:
        return jsonify({"memos": []})

    grp_ids = grp_ids_str.split(',')
    dates = dates_str.split(',')

    try:
        with get_db_connection() as db_connection:
            grp_memo_mapper = GrpMemoMapper(db_connection)
            memos = grp_memo_mapper.get_all_memos_with_dates(grp_ids, dates)
        return jsonify({"memos": memos})
    except Exception as e:
        current_app.logger.error(f"Failed to get batch memos: {e}", exc_info=True)
        return jsonify({"error": "메모 조회 중 오류가 발생했습니다."}), 500
