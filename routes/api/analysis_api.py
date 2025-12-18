from flask import Blueprint, request, jsonify, session, current_app
import logging
from datetime import datetime
from functools import wraps
import pytz

from msys.database import get_db_connection
from utils.datetime_utils import convert_datetime_fields_to_kst_str
from utils.logging_config import log_operation
from dao.analytics_dao import AnalyticsDAO
from service.dashboard_service import DashboardService
from service.mst_service import ConMstService
from service.analysis_service import AnalysisService
from routes.auth_routes import login_required, check_password_change_required, analysis_required, data_analysis_required

analysis_api_bp = Blueprint('analysis_api', __name__, url_prefix='/api/analytics')

@analysis_api_bp.route('/success_rate_trend', methods=['GET'])
@login_required
@check_password_change_required
def get_analytics_success_rate_trend_api():
    """
    [분석 차트용] 기간별 Job ID별 수집 성공률 추이 데이터를 제공하는 API.
    """
    log_operation("분석", "성공률 추이", "API 요청", "수신됨")
    try:
        with get_db_connection() as conn:
            dashboard_service = DashboardService(conn)
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            job_ids = request.args.getlist('job_ids')
            user = session.get('user')

            if not start_date_str or not end_date_str:
                log_operation("분석", "성공률 추이", "파라미터 검증", "날짜 누락", "WARNING")
                return jsonify({"message": "시작 및 종료 날짜가 필요합니다."}), 400
            try:
                start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                if start_date_obj > end_date_obj:
                    log_operation("분석", "성공률 추이", "파라미터 검증", "날짜 범위 오류", "WARNING")
                    return jsonify({"message": "시작 날짜는 종료 날짜보다 빠를 수 없습니다."}), 400
            except ValueError:
                log_operation("분석", "성공률 추이", "파라미터 검증", "날짜 형식 오류", "WARNING")
                return jsonify({"message": "날짜 형식이 유효하지 않습니다.YYYY-MM-DD 형식을 사용해주세요."}), 400

            trend_data = dashboard_service.get_analytics_success_rate_trend(start_date_str, end_date_str, job_ids, user=user)
            log_operation("분석", "성공률 추이", "응답 생성", f"{len(trend_data)}건 전송")
            return jsonify(trend_data), 200
    except Exception as e:
        log_operation("분석", "성공률 추이", "데이터 조회", f"실패: {type(e).__name__}", "ERROR")
        return jsonify({"message": "분석 성공률 추이 데이터 조회 중 오류가 발생했습니다."}), 500

@analysis_api_bp.route('/trouble_by_code', methods=['GET'])
@login_required
@check_password_change_required
def get_analytics_trouble_by_code_api():
    """
    [분석 차트용] 장애 코드별 비율 데이터를 제공하는 API.
    """
    logging.info("▶ API: /api/analytics/trouble_by_code 요청 수신")
    try:
        with get_db_connection() as conn:
            dashboard_service = DashboardService(conn)
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            job_ids = request.args.getlist('job_ids')
            user = session.get('user')

            if not start_date_str or not end_date_str:
                return jsonify({"message": "시작 및 종료 날짜가 필요합니다."}), 400
            try:
                start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                if start_date_obj > end_date_obj:
                    return jsonify({"message": "시작 날짜는 종료 날짜보다 빠를 수 없습니다."}), 400
            except ValueError:
                return jsonify({"message": "날짜 형식이 유효하지 않습니다.YYYY-MM-DD 형식을 사용해주세요."}), 400

            trouble_data = dashboard_service.get_trouble_by_code(start_date_str, end_date_str, job_ids, user=user)
            return jsonify(trouble_data), 200
    except Exception as e:
        logging.error(f"❌ API: 분석 장애 데이터 조회 중 오류 발생: {e}", exc_info=True)
        return jsonify({"message": "분석 장애 데이터 조회 중 오류이 발생했습니다."}), 500

@analysis_api_bp.route('/summary', methods=['GET'])
@login_required
@check_password_change_required
def api_analysis_summary():
    """
    [공통화] 대시보드와 데이터 구조/필터링 방식이 완전히 동일하므로,
    중복 방지를 위해 대시보드 summary API를 그대로 재사용함.
    """
    # Re-implementing the logic from get_dashboard_summary to avoid direct call
    try:
        with get_db_connection() as conn:
            dashboard_service = DashboardService(conn)
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            all_data_str = request.args.get('all_data', 'false')
            all_data = all_data_str.lower() == 'true'
            user = session.get('user')

            if not all_data:
                if not start_date_str or not end_date_str:
                    return jsonify({"message": "시작 및 종료 날짜가 필요합니다."}), 400

            summary_data = dashboard_service.get_summary(start_date_str, end_date_str, all_data, user=user)

            # Convert datetime objects to KST strings before jsonify
            convert_datetime_fields_to_kst_str(summary_data)
            # None 값을 빈 문자열로 변환
            for item in summary_data:
                for key, value in item.items():
                    if value is None:
                        item[key] = ''

            return jsonify(summary_data), 200
    except Exception as e:
        logging.error(f"❌ API: 분석 요약 데이터 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "데이터 조회 중 오류가 발생했습니다."}), 500

@analysis_api_bp.route('/trend', methods=['GET'])
@login_required
@check_password_change_required
def api_analysis_trend():
    """
    데이터분석 추이/경향 데이터를 제공하는 API.
    """
    try:
        with get_db_connection() as conn:
            dashboard_service = DashboardService(conn)
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            job_ids_str = request.args.get('job_ids')
            job_ids = job_ids_str.split(',') if job_ids_str else None
            user = session.get('user')
            data = dashboard_service.get_analytics_success_rate_trend(start_date, end_date, job_ids, user=user)

            # Convert datetime objects to KST strings before jsonify
            convert_datetime_fields_to_kst_str(data)
            # None 값을 빈 문자열로 변환
            for item in data:
                for key, value in item.items():
                    if value is None:
                        item[key] = ''

            return jsonify(data), 200
    except Exception as e:
        return jsonify({'message': f'추이 데이터 조회 실패: {e}'}), 500

@analysis_api_bp.route('/raw_data', methods=['GET'])
@login_required
@check_password_change_required
def api_analysis_raw_data():
    """
    데이터분석 원천데이터(상세 로그) API.
    """
    try:
        with get_db_connection() as conn:
            dashboard_service = DashboardService(conn)
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            job_ids_str = request.args.get('job_ids')
            job_ids = job_ids_str.split(',') if job_ids_str else None
            user = session.get('user')

            # 권한 확인 로깅 추가
            user_id = user.get('user_id', 'Unknown') if user else 'NoUser'
            data_permissions = user.get('data_permissions', []) if user else []
            is_admin = user and 'mngr_sett' in user.get('permissions', [])
            current_app.logger.warning(f"[ANALYSIS_RAW_DATA] User: {user_id}, Admin: {is_admin}, Requested: {job_ids}, DataPerms: {data_permissions}")

            rows = dashboard_service.get_raw_data(start_date, end_date, job_ids, all_data=False, user=user)

            # Convert datetime objects to KST strings before jsonify
            convert_datetime_fields_to_kst_str(rows)
            # None 값을 빈 문자열로 변환
            for item in rows:
                for key, value in item.items():
                    if value is None:
                        item[key] = ''

            return jsonify(rows), 200
    except Exception as e:
        return jsonify({'message': f'원천데이터 조회 실패: {e}'}), 500

@analysis_api_bp.route('/job_ids', methods=['GET'])
@login_required
@check_password_change_required
def api_analysis_job_ids():
    """
    tb_con_hist에 실제로 존재하는 job_id만 중복 없이 반환하는 API.
    """
    log_operation("분석", "Job ID 목록", "API 요청", "수신됨")
    try:
        with get_db_connection() as conn:
            dashboard_service = DashboardService(conn)
            user = session.get('user')
            job_ids = dashboard_service.get_distinct_job_ids(user=user)
            result = [{"job_id": job_id} for job_id in job_ids if job_id]
            log_operation("분석", "Job ID 목록", "응답 생성", f"{len(result)}건 전송")
            return jsonify(result), 200
    except Exception as e:
        log_operation("분석", "Job ID 목록", "데이터 조회", f"실패: {type(e).__name__}", "ERROR")
        return jsonify({'message': f'Job ID 목록 조회 실패: {e}'}), 500

@analysis_api_bp.route('/error_codes', methods=['GET'])
def api_analysis_error_codes():
    """
    tb_con_hist에서 실제 존재하는 장애코드(status) 목록을 반환하는 API.
    """
    try:
        with get_db_connection() as conn:
            dashboard_service = DashboardService(conn)
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            all_data_str = request.args.get('all_data', 'false')
            all_data = all_data_str.lower() == 'true'

            # dashboard_service를 통해 데이터 조회
            user = session.get('user')
            error_codes = dashboard_service.get_distinct_error_codes(start_date, end_date, all_data, user=user)

            status_names = {
                'CD901': '정상(성공)',
                'CD902': '실패',
                'CD903': '미수집',
                'CD904': '계측중'
            }

            result = [{"code": code, "name": status_names.get(code, code)} for code in error_codes]
            return jsonify(result), 200
    except Exception as e:
        logging.error(f"❌ API: 장애코드 목록 조회 실패: {e}", exc_info=True)
        return jsonify({'message': f'장애코드 목록 조회 실패: {e}'}), 500

@analysis_api_bp.route('/error_code_map', methods=['GET'])
@login_required
@check_password_change_required
def api_analysis_error_code_map():
    """
    tb_con_mst에서 cd_cl='CD900'인 장애코드와 item1(영문명) 매핑만 반환
    """
    try:
        with get_db_connection() as conn:
            mst_service = ConMstService(conn)
            rows = mst_service.get_error_code_map()
            code_map = {row['cd']: row['item1'] for row in rows}
            return jsonify(code_map), 200
    except Exception as e:
        return jsonify({'message': f'장애코드 매핑 조회 실패: {e}'}), 500

@analysis_api_bp.route('/dynamic-chart', methods=['GET'])
@login_required
@check_password_change_required
def get_dynamic_chart_data():
    """
    사용자 정의 파라미터를 기반으로 동적 차트 데이터를 제공하는 API.
    ---
    parameters:
      - name: x_axis
        in: query
        type: string
        required: true
        description: '차트의 X축으로 사용할 차원 (예: date, job_id, status)'
        enum: ['date', 'job_id', 'status']
      - name: y_axis
        in: query
        type: string
        required: true
        description: '차트의 Y축으로 사용할 측정 항목 (예: success_count, fail_count, total_count, success_rate)'
        enum: ['success_count', 'fail_count', 'no_data_count', 'total_count', 'success_rate']
      - name: group_by
        in: query
        type: string
        required: false
        description: '데이터를 그룹화할 추가 차원 (예: job_id, status)'
        enum: ['job_id', 'status']
      - name: start_date
        in: query
        type: string
        required: true
        description: '조회 시작 날짜 (YYYY-MM-DD)'
      - name: end_date
        in: query
        type: string
        required: true
        description: '조회 종료 날짜 (YYYY-MM-DD)'
      - name: job_ids
        in: query
        type: array
        items:
          type: string
        required: false
        description: '필터링할 Job ID 목록'
    responses:
      200:
        description: '동적 차트 데이터 조회 성공'
        schema:
          type: array
          items:
            type: object
      400:
        description: '필수 파라미터 누락 또는 유효하지 않은 파라미터'
      500:
        description: '서버 내부 오류'
    """
    logging.info("▶ API: /api/analysis/dynamic-chart 요청 수신")
    try:
        with get_db_connection() as conn:
            analysis_service = AnalysisService(conn)
            params = {
                'x_axis': request.args.get('x_axis'),
                'y_axis': request.args.get('y_axis'),
                'group_by': request.args.get('group_by'),
                'start_date': request.args.get('start_date'),
                'end_date': request.args.get('end_date'),
                'job_ids': request.args.getlist('job_ids')
            }

            # 필수 파라미터 검증
            if not all([params['x_axis'], params['y_axis'], params['start_date'], params['end_date']]):
                return jsonify({"message": "x_axis, y_axis, start_date, end_date는 필수 파라미터입니다."}), 400

            user = session.get('user')
            chart_data = analysis_service.get_dynamic_chart_data(params, user=user)
            return jsonify(chart_data), 200
    except ValueError as ve:
        logging.error(f"❌ API: 유효하지 않은 파라미터: {ve}", exc_info=True)
        return jsonify({"message": str(ve)}), 400
    except Exception as e:
        logging.error(f"❌ API: 동적 차트 데이터 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "동적 차트 데이터 조회 중 오류가 발생했습니다."}), 500
