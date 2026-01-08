from flask import Blueprint, request, jsonify, Response, render_template, session, g
import logging
import json
import csv
import io
from datetime import datetime

from service.mngr_sett_service import MngrSettService
from service.icon_service import IconService
from msys.database import get_db_connection
from service.user_service import UserService
from .auth_routes import login_required, check_password_change_required, admin_required

mngr_sett_bp = Blueprint('mngr_sett', __name__)

@mngr_sett_bp.route('/mngr_sett', methods=['GET'])
@login_required
@check_password_change_required
def mngr_sett_page():
    """관리자 설정 페이지를 렌더링합니다."""
    return render_template('mngr_sett.html')

# --- API Endpoints ---
api_mngr_sett_bp = Blueprint('api_mngr_sett', __name__, url_prefix='/api/mngr_sett')

def mngr_sett_required(f):
    """'mngr_sett' 권한을 확인하는 데코레이터"""
    def decorated_function(*args, **kwargs):
        # g.user 대신 session['user']를 사용하도록 수정
        if 'user' not in session or 'mngr_sett' not in session['user'].get('permissions', []):
            return jsonify({"error": "관리자 권한이 필요합니다."}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@api_mngr_sett_bp.route('/settings/all', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def get_all_mngr_sett():
    """
    모든 관리자 설정 데이터를 제공하는 API.
    """
    logging.info("=== API: get_all_mngr_sett() 시작 ===")
    current_user = session.get('user', {})
    logging.info(f"Current user: {current_user.get('user_id', 'None')}")
    logging.info(f"User permissions: {current_user.get('permissions', [])}")

    try:
        conn = get_db_connection()
        mngr_sett_service = MngrSettService(conn)
        settings = mngr_sett_service.get_all_settings()
        conn.commit()
        logging.info(f"=== API: get_all_mngr_sett() 완료. 반환 설정 개수: {len(settings)} ===")
        return jsonify(settings), 200
    except Exception as e:
        logging.error(f"❌ API: 모든 관리자 설정 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "관리자 설정 조회 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/settings/save', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def save_all_settings():
    """
    모든 관리자 설정(Job ID별 설정, 사용자 권한)을 한번에 저장하는 통합 API.
    """
    data = request.json
    
    mngr_settings = data.get('mngr_settings', [])
    user_permissions = data.get('user_permissions', [])

    if not mngr_settings and not user_permissions:
        return jsonify({"message": "저장할 데이터가 없습니다."}), 400

    try:
        conn = get_db_connection()
        # 1. Job ID별 설정 저장
        if mngr_settings:
            mngr_sett_service = MngrSettService(conn)
            for settings_data in mngr_settings:
                mngr_sett_service.insert_or_update_settings(settings_data)

        # 2. 사용자 권한 정보 저장
        if user_permissions:
            user_service = UserService(conn)
            current_user_id = session.get('user', {}).get('user_id')

            # 비교를 위해 현재 모든 사용자의 권한 정보를 가져옵니다.
            all_users_data = user_service.get_all_users_with_permissions()
            existing_permissions_map = {
                user['user_id']: set(user.get('permissions', []))
                for user in all_users_data.get('users', [])
            }

            for perm_data in user_permissions:
                user_id = perm_data.get('user_id')
                # 비교를 위해 새로운 권한 목록을 집합(set)으로 변환합니다.
                new_menu_ids_set = set(perm_data.get('menu_ids', []))
                
                if user_id:
                    # 기존 권한과 새로운 권한을 비교합니다.
                    existing_perms_set = existing_permissions_map.get(user_id, set())
                    
                    if new_menu_ids_set != existing_perms_set:
                        # 서비스 메소드에는 다시 리스트 형태로 전달합니다.
                        new_menu_ids_list = list(new_menu_ids_set)
                        user_service.update_permissions(user_id, new_menu_ids_list)
                        
                        # 만약 업데이트된 사용자가 현재 로그인한 사용자와 동일하다면,
                        # 세션의 권한 정보도 즉시 갱신합니다.
                        if user_id == current_user_id:
                            session['user']['permissions'] = new_menu_ids_list
                            session.modified = True  # 세션이 수정되었음을 명시적으로 알림
                    else:
                        # 권한에 변경이 없는 경우 로그만 남기고 건너뜁니다.
                        pass

        conn.commit()
    
        return jsonify({"message": "모든 설정이 성공적으로 저장되었습니다."}), 200
    except Exception as e:
        logging.error(f"❌ API: 통합 설정 저장 실패: {e}", exc_info=True)
        return jsonify({"message": f"설정 저장 실패: {e}"}), 500

@api_mngr_sett_bp.route('/settings/export', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def export_mngr_sett():
    try:
        conn = get_db_connection()
        mngr_sett_service = MngrSettService(conn)
        settings = mngr_sett_service.get_all_settings()
        response = Response(json.dumps(settings, indent=4, ensure_ascii=False), mimetype='application/json')
        response.headers["Content-Disposition"] = "attachment; filename=admin_settings.json"
        return response
    except Exception as e:
        logging.error(f"❌ API: 관리자 설정 내보내기 실패: {e}", exc_info=True)
        return jsonify({"message": f"설정 내보내기 실패: {e}"}), 500

@api_mngr_sett_bp.route('/settings/import', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def import_mngr_sett():
    if 'file' not in request.files:
        return jsonify({"message": "파일이 없습니다."}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "파일을 선택해주세요."}), 400
    if file and file.filename.endswith('.json'):
        try:
            settings_data = json.load(file.stream)
            if not isinstance(settings_data, list):
                return jsonify({"message": "JSON 파일 형식이 올바르지 않습니다. 리스트 형태여야 합니다."}), 400

            conn = get_db_connection()
            mngr_sett_service = MngrSettService(conn)
            mngr_sett_service.import_settings(settings_data)
            conn.commit()
            return jsonify({"message": f"{len(settings_data)}개 설정 성공적으로 가져왔습니다."}), 200
        except json.JSONDecodeError:
            return jsonify({"message": "유효하지 않은 JSON 파일입니다."}), 400
        except Exception as e:
            return jsonify({"message": f"설정 가져오기 실패: {e}"}), 500
    else:
        return jsonify({"message": "JSON 파일만 허용됩니다."}), 400

@api_mngr_sett_bp.route('/icons/all', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def get_all_icons():
    """
    모든 아이콘 데이터를 제공하는 API.
    """
    try:
        conn = get_db_connection()
        icon_service = IconService(conn)
        icons = icon_service.get_all_icons_data()
        return jsonify(icons), 200
    except Exception as e:
        logging.error(f"❌ API: 모든 아이콘 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "아이콘 조회 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/icons/save', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def save_icon():
    icon_data = request.json
    logging.info(f"--- API: Saving icon data: {icon_data}")
    try:
        conn = get_db_connection()
        icon_service = IconService(conn)
        icon_service.insert_or_update_icon(icon_data)
        conn.commit()
        return jsonify({"message": "아이콘이 성공적으로 저장되었습니다."}), 200
    except Exception as e:
        logging.error(f"❌ API: 아이콘 저장 실패: {e}", exc_info=True)
        return jsonify({"message": f"아이콘 저장 실패: {e}"}), 500

@api_mngr_sett_bp.route('/icons/delete/<int:icon_id>', methods=['DELETE'])
@login_required
@check_password_change_required
@mngr_sett_required
def delete_icon(icon_id):
    try:
        conn = get_db_connection()
        icon_service = IconService(conn)
        icon_service.delete_icon(icon_id)
        conn.commit()
        return jsonify({"message": "아이콘이 성공적으로 삭제되었습니다."}), 200
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"❌ API: 아이콘 삭제 실패 (ID: {icon_id}): {e}", exc_info=True)
        return jsonify({"message": f"아이콘 삭제 실패: {e}"}), 500

@api_mngr_sett_bp.route('/icons/toggle-display', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def toggle_icon_display():
    data = request.json
    icon_id = data.get('icon_id')
    display_yn = data.get('icon_dsp_yn')
    if icon_id is None or display_yn is None:
        return jsonify({"message": "icon_id와 icon_dsp_yn이 필요합니다."}), 400
    try:
        conn = get_db_connection()
        icon_service = IconService(conn)
        icon_service.toggle_icon_display(icon_id, display_yn)
        conn.commit()
        return jsonify({"message": "아이콘 표시 여부가 업데이트되었습니다."}), 200
    except Exception as e:
        logging.error(f"❌ API: 아이콘 표시 여부 토글 실패 (ID: {icon_id}): {e}", exc_info=True)
        return jsonify({"message": f"아이콘 표시 여부 업데이트 실패: {e}"}), 500

@api_mngr_sett_bp.route('/icons/export', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def export_icons():
    """
    모든 아이콘 데이터를 JSON 파일로 내보내는 API.
    """
    try:
        conn = get_db_connection()
        icon_service = IconService(conn)
        icons = icon_service.get_all_icons_data()
        
        output = io.StringIO()
        output.write('\ufeff') # UTF-8 BOM for Excel compatibility

        # 동적으로 필드 이름 결정, 데이터가 없을 경우 기본 헤더 사용
        if icons:
            # 첫 번째 데이터의 키를 사용하여 필드 순서를 보장
            fieldnames = list(icons[0].keys())
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(icons)
        else:
            # 데이터가 없을 때 기본 헤더만 작성
            fieldnames = ['ICON_ID', 'ICON_CD', 'ICON_NM', 'ICON_EXPL', 'ICON_DSP_YN', 'REGR_ID', 'REG_DT', 'UPDR_ID', 'UPD_DT']
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

        response = Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={"Content-Disposition": "attachment;filename=icons.csv"}
        )
        return response
    except Exception as e:
        logging.error(f"❌ API: 아이콘 CSV 데이터 내보내기 실패: {e}", exc_info=True)
        return jsonify({"message": "아이콘 데이터 내보내기 중 오류가 발생했습니다."}), 500

# --- 사용자 관리 API ---

@api_mngr_sett_bp.route('/users', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def get_all_users():
    """모든 사용자 목록과 각 사용자의 권한 정보를 반환합니다."""
    try:
        search_term = request.args.get('search_term', None)
        conn = get_db_connection()
        user_service = UserService(conn)
        data = user_service.get_all_users_with_permissions(search_term)
        return jsonify(data), 200
    except Exception as e:
        logging.error(f"❌ API: 사용자 목록 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "사용자 목록 조회 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/users/approve', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def approve_user():
    """사용자를 승인하고 비밀번호를 ID와 동일하게 초기화합니다."""
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400

    try:
        conn = get_db_connection()
        user_service = UserService(conn)
        user_service.approve_user(user_id)
        conn.commit()
        return jsonify({"message": f"'{user_id}' 사용자가 승인되었습니다."}), 200
    except Exception as e:
        logging.error(f"❌ API: 사용자 승인 실패: {e}", exc_info=True)
        return jsonify({"message": "사용자 승인 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/users/reject', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def reject_user():
    """사용자 가입 신청을 거절하고 데이터베이스에서 삭제합니다."""
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400

    try:
        conn = get_db_connection()
        user_service = UserService(conn)
        user_service.reject_user(user_id)
        conn.commit()
        return jsonify({"message": f"'{user_id}' 사용자의 가입 신청이 거절되었습니다."}), 200
    except Exception as e:
        logging.error(f"❌ API: 사용자 거절 실패: {e}", exc_info=True)
        return jsonify({"message": "사용자 거절 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/users/delete', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def delete_user():
    """관리자가 승인된 사용자를 삭제합니다."""
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400

    try:
        conn = get_db_connection()
        user_service = UserService(conn)
        user_service.delete_user(user_id)
        conn.commit()
        return jsonify({"message": f"'{user_id}' 사용자가 삭제되었습니다."}), 200
    except Exception as e:
        logging.error(f"❌ API: 사용자 삭제 실패: {e}", exc_info=True)
        return jsonify({"message": "사용자 삭제 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/users/reset-password', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def reset_password():
    """사용자 비밀번호를 ID와 동일하게 초기화합니다."""
    data = request.json
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400

    try:
        conn = get_db_connection()
        user_service = UserService(conn)
        user_service.reset_password(user_id)
        conn.commit()
        return jsonify({"message": f"'{user_id}' 사용자의 비밀번호가 초기화되었습니다."}), 200
    except Exception as e:
        logging.error(f"❌ API: 비밀번호 초기화 실패: {e}", exc_info=True)
        return jsonify({"message": "비밀번호 초기화 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/users/permissions', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def update_user_permissions():
    """사용자의 메뉴 접근 권한을 업데이트합니다."""
    data = request.json
    user_id = data.get('user_id')
    menu_ids = data.get('menu_ids', [])
    
    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400

    try:
        conn = get_db_connection()
        user_service = UserService(conn)
        user_service.update_permissions(user_id, menu_ids)
        conn.commit()
        return jsonify({"message": f"'{user_id}' 사용자의 권한이 업데이트되었습니다."}), 200
    except ValueError as e:
        # 서비스 계층에서 발생시킨 명확한 오류 메시지를 클라이언트에게 전달합니다.
        logging.error(f"❌ API: 사용자 권한 업데이트 실패 (잘못된 요청): {e}", exc_info=True)
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"❌ API: 사용자 권한 업데이트 실패 (서버 오류): {e}", exc_info=True)
        return jsonify({"message": "사용자 권한 업데이트 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/users/permissions/bulk', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def update_bulk_user_permissions():
    """여러 사용자의 메뉴 접근 권한을 한 번에 업데이트합니다."""
    data = request.json
    permissions_data = data.get('permissions', [])
    
    if not permissions_data:
        return jsonify({"message": "업데이트할 권한 데이터가 없습니다."}), 400

    try:
        conn = get_db_connection()
        user_service = UserService(conn)
        
        current_user_id = session.get('user', {}).get('user_id')

        for item in permissions_data:
            user_id = item.get('user_id')
            menu_ids = item.get('menu_ids', [])
            if user_id:
                user_service.update_permissions(user_id, menu_ids)
                # 만약 업데이트된 사용자가 현재 로그인한 사용자와 동일하다면,
                # 세션의 권한 정보도 즉시 갱신합니다.
                if user_id == current_user_id:
                    session['user']['permissions'] = menu_ids
                    session.modified = True  # 세션이 수정되었음을 명시적으로 알림
        
        conn.commit()
        return jsonify({"message": "사용자 권한이 성공적으로 저장되었습니다."}), 200
    except ValueError as e:
        logging.error(f"❌ API: 사용자 권한 대량 업데이트 실패 (잘못된 요청): {e}", exc_info=True)
        return jsonify({"message": str(e)}), 400
    except Exception as e:
       logging.error(f"❌ API: 사용자 권한 대량 업데이트 실패 (서버 오류): {e}", exc_info=True)
       return jsonify({"message": "사용자 권한 대량 업데이트 중 오류가 발생했습니다."}), 500

# --- Schedule Settings API ---
@api_mngr_sett_bp.route('/schedule_settings', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def get_schedule_display_settings():
    """데이터 수집 일정 표시 설정을 조회합니다."""
    logging.info("=== ROUTE: get_schedule_display_settings() 시작 ===")
    logging.info(f"ROUTE: 요청 정보 - Method: {request.method}, URL: {request.url}, User: {session.get('user', {}).get('user_id', 'Unknown')}")

    try:
        # 데이터베이스 연결
        logging.info("ROUTE: 데이터베이스 연결 시도")
        conn = get_db_connection()
        logging.info("ROUTE: 데이터베이스 연결 성공")

        # 서비스 생성
        logging.info("ROUTE: MngrSettService 인스턴스 생성")
        service = MngrSettService(conn)
        logging.info("ROUTE: MngrSettService 인스턴스 생성 성공")

        # 서비스 메소드 호출
        logging.info("ROUTE: service.get_schedule_settings_service() 호출")
        settings = service.get_schedule_settings_service()
        logging.info(f"ROUTE: 서비스 호출 완료. 반환 타입: {type(settings)}")

        # 결과 검증
        if settings is None:
            logging.warning("ROUTE: 서비스에서 None 반환")
            response = jsonify(None), 200
        elif isinstance(settings, dict):
            logging.info(f"ROUTE: 서비스에서 {len(settings)}개 필드의 딕셔너리 반환")
            # JSON 직렬화 시도
            logging.info("ROUTE: JSON 직렬화 시도")
            response = jsonify(settings), 200
            logging.info("ROUTE: JSON 직렬화 성공")
        else:
            logging.error(f"ROUTE: 서비스에서 예상치 못한 타입 반환: {type(settings)}")
            response = jsonify({"message": f"서비스에서 잘못된 데이터 타입 반환: {type(settings)}"}), 500

        logging.info("=== ROUTE: get_schedule_display_settings() 성공 완료 ===")
        return response

    except Exception as e:
        # 실제 예외 타입과 메시지 상세 로깅
        logging.error(f"ROUTE: 스케줄 표시 설정 조회 중 예외 발생 - 타입: {type(e).__name__}, 메시지: {str(e)}", exc_info=True)

        # 추가 디버깅 정보
        try:
            import traceback
            logging.error(f"ROUTE: 전체 스택 트레이스:\n{traceback.format_exc()}")

            # 현재 작업 디렉토리와 파일 경로 확인
            import os
            current_dir = os.getcwd()
            logging.error(f"ROUTE: 현재 작업 디렉토리: {current_dir}")

            sql_file_path = os.path.join(current_dir, 'sql', 'mngr_sett', 'get_schedule_settings.sql')
            file_exists = os.path.exists(sql_file_path)
            logging.error(f"ROUTE: SQL 파일 존재 여부 ({sql_file_path}): {file_exists}")

            # 현재 세션 상태 로깅
            if 'user' in session:
                logging.info(f"ROUTE: 세션 사용자 정보: {session['user'].get('user_id', 'Unknown')}")
                logging.info(f"ROUTE: 세션 권한 정보: {session['user'].get('permissions', [])}")
            else:
                logging.warning("ROUTE: 세션에 사용자 정보 없음")

        except Exception as log_error:
            logging.error(f"ROUTE: 추가 로깅 중 오류: {log_error}")

        except Exception as log_error:
            logging.error(f"ROUTE: 추가 로깅 중 오류: {log_error}")

        # 클라이언트에게 반환할 오류 응답
        error_response = {
            "message": "스케줄 표시 설정 조회 중 오류가 발생했습니다.",
            "error_type": type(e).__name__,
            "timestamp": str(datetime.now())
        }

        logging.info("=== ROUTE: get_schedule_display_settings() 오류로 종료 ===")
        return jsonify(error_response), 500

@api_mngr_sett_bp.route('/schedule_settings/save', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def save_schedule_display_settings():
    """데이터 수집 일정 표시 설정을 저장(생성 또는 업데이트)합니다."""
    settings_data = request.json
    if not settings_data:
        return jsonify({"message": "저장할 데이터가 없습니다."}), 400
    
    try:
        conn = get_db_connection()
        service = MngrSettService(conn)
        
        user_id = session.get('user', {}).get('user_id', 'system')

        logging.info(f"--- API: Received data for schedule settings: {settings_data}")
        result = service.save_schedule_settings_service(settings_data, user_id)

        conn.commit()
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"❌ API: 스케줄 표시 설정 저장 실패: {e}", exc_info=True)
        conn.rollback()
        return jsonify({"message": "스케줄 표시 설정 저장 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/icons/import', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def import_icons():
    """
    CSV 파일에서 아이콘 데이터를 가져와 데이터베이스에 추가/업데이트하는 API.
    """
    if 'file' not in request.files:
        return jsonify({"message": "파일이 요청에 포함되지 않았습니다."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "파일이 선택되지 않았습니다."}), 400

    # 파일 확장자 확인 (CSV만 허용)
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"message": "CSV 파일만 업로드할 수 있습니다."}), 400

    conn = None
    try:
        conn = get_db_connection()
        icon_service = IconService(conn)
        
        # 서비스의 import_icons_from_csv 함수를 호출하여 파일을 처리합니다.
        # file.stream은 파일의 내용을 바이트 스트림으로 제공합니다.
        count = icon_service.import_icons_from_csv(file.stream)
        
        logging.info("데이터베이스 트랜잭션 커밋을 시도합니다.")
        conn.commit()
        logging.info("데이터베이스 트랜잭션이 성공적으로 커밋되었습니다.")
        
        return jsonify({"message": f"성공적으로 {count}개의 아이콘을 가져왔습니다."}), 200
    except ValueError as ve:
        logging.warning(f"처리할 데이터가 없어 롤백합니다: {ve}")
        if conn:
            conn.rollback()
        return jsonify({"message": str(ve)}), 400
    except Exception as e:
        logging.error(f"❌ API: 아이콘 CSV 가져오기 중 예외 발생, 롤백을 시도합니다: {e}", exc_info=True)
        if conn:
            conn.rollback()
        return jsonify({"message": f"아이콘 가져오기 중 오류가 발생했습니다: {e}"}), 500

# --- 데이터 접근 권한 API ---

@api_mngr_sett_bp.route('/data_permission/users', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def get_users_for_data_permission():
    """데이터 접근 권한 설정을 위한 사용자 목록을 조회합니다. (기존 로직 재사용)"""
    try:
        search_term = request.args.get('search_term')
        conn = get_db_connection()
        user_service = UserService(conn)
        
        # 1. 기존의 안정적인 사용자 정보 + 메뉴 권한 조회 함수를 호출합니다.
        user_data = user_service.get_all_users_with_permissions(search_term)
        users = user_data.get('users', [])

        # 2. 각 사용자에게 데이터 접근 권한(Job ID) 정보를 추가합니다.
        mngr_sett_service = MngrSettService(conn)
        for user in users:
            user_id = user.get('user_id')
            # MngrSettService에 사용자 ID로 Job ID 목록을 가져오는 간단한 메서드를 추가하거나
            # 직접 매퍼를 사용하여 가져올 수 있습니다. 여기서는 후자를 가정합니다.
            job_ids = mngr_sett_service.user_mapper.find_data_permissions_by_user_id(user_id)
            # Job ID를 오름차순으로 정렬
            user['job_ids'] = sorted(job_ids) if job_ids else []

        return jsonify(users), 200
    except Exception as e:
        logging.error(f"❌ API: 데이터 접근 권한 사용자 목록 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "사용자 목록 조회 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/data_permission/jobs', methods=['GET'])
@login_required
@check_password_change_required
@mngr_sett_required
def get_jobs_for_data_permission():
    """특정 사용자의 데이터 접근 권한 설정을 위한 Job ID 목록을 조회합니다."""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400
    try:
        conn = get_db_connection()
        service = MngrSettService(conn)
        jobs_data = service.get_jobs_for_permission_setting(user_id)
        return jsonify(jobs_data), 200
    except Exception as e:
        logging.error(f"❌ API: 데이터 접근 권한 Job 목록 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "Job 목록 조회 중 오류가 발생했습니다."}), 500

@api_mngr_sett_bp.route('/data_permission/save', methods=['POST'])
@login_required
@check_password_change_required
@mngr_sett_required
def save_data_permission():
    """특정 사용자의 데이터 접근 권한을 저장합니다."""
    data = request.json
    user_id = data.get('user_id')
    job_ids = data.get('job_ids', [])
    
    logging.info(f"--- API: /data_permission/save 요청 수신. user_id: {user_id}, job_ids: {job_ids}")
    
    if not user_id:
        return jsonify({"message": "user_id가 필요합니다."}), 400

    try:
        conn = get_db_connection()
        service = MngrSettService(conn)
        service.save_data_permissions(user_id, job_ids)
        conn.commit()
        return jsonify({"message": f"'{user_id}' 사용자의 데이터 접근 권한이 성공적으로 저장되었습니다."}), 200
    except Exception as e:
        conn.rollback()
        logging.error(f"❌ API: 데이터 접근 권한 저장 실패: {e}", exc_info=True)
        return jsonify({"message": "데이터 접근 권한 저장 중 오류가 발생했습니다."}), 500
