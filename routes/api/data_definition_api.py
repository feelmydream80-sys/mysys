# routes/api/data_definition_api.py
from flask import Blueprint, request, jsonify, session
import logging
from service.data_definition_service import DataDefinitionService
from msys.database import get_db_connection
from routes.auth_routes import login_required, check_password_change_required
from utils.datetime_utils import convert_datetime_fields_to_kst_str
from utils.job_utils import should_exclude_job

bp = Blueprint('data_definition_api', __name__, url_prefix='/api/data_definition')

@bp.route('/list', methods=['GET'])
@login_required
@check_password_change_required
def get_data_list():
    """데이터 목록을 조회합니다."""
    try:
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            data = service.get_data_list()
            return jsonify(data), 200
    except Exception as e:
        logging.error(f"Error fetching data list: {e}", exc_info=True)
        return jsonify({"message": "Error fetching data list."}), 500

@bp.route('/groups', methods=['GET'])
@login_required
@check_password_change_required
def get_data_groups():
    """전체 데이터 목록을 조회합니다."""
    try:
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            groups = service.get_data_groups()
            
            # 로그 추가
            logging.info(f"🔍 get_data_groups API 결과 개수: {len(groups)}")
            for i, row in enumerate(groups[:10]):  # 상위 10개만 로그
                logging.info(f"🔍 get_data_groups API 결과 {i+1}: {row}")
            
            return jsonify(groups), 200
    except Exception as e:
        logging.error(f"Error fetching data groups: {e}", exc_info=True)
        return jsonify({"message": "Error fetching data groups."}), 500

@bp.route('/group/<cd>', methods=['GET'])
@login_required
@check_password_change_required
def get_group_details(cd):
    """특정 그룹의 상세 정보를 조회합니다."""
    try:
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            details = service.get_group_details(cd)
            
            # KST 시간대 변환
            convert_datetime_fields_to_kst_str(details)
            
            # 로그 추가
            logging.info(f"🔍 get_group_details API 결과 개수: {len(details)}")
            for i, row in enumerate(details[:5]):  # 상위 5개만 로그
                logging.info(f"🔍 get_group_details API 결과 {i+1}: {row}")
            
            return jsonify(details), 200
    except Exception as e:
        logging.error(f"Error fetching group details: {e}", exc_info=True)
        return jsonify({"message": "Error fetching group details."}), 500

@bp.route('/create', methods=['POST'])
@login_required
@check_password_change_required
def create_data():
    """새로운 데이터를 생성합니다."""
    try:
        data = request.json
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            service.create_data(data)
            conn.commit()
            return jsonify({"message": "Data created successfully."}), 201
    except ValueError as e:
        logging.warning(f"Failed to create data: {e}")
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"Error creating data: {e}", exc_info=True)
        return jsonify({"message": "Error creating data."}), 500

@bp.route('/create_mngr_sett', methods=['POST'])
@login_required
@check_password_change_required
def create_mngr_sett():
    """관리자 설정 데이터를 생성합니다."""
    try:
        data = request.json
        cd = data.get('cd')
        
        if not cd:
            return jsonify({"message": "CD is required."}), 400

        # CD900-CD999 범위와 100의 배수는 제외
        if should_exclude_job(cd):
            return jsonify({"message": "CD900-CD999 범위와 100의 배수는 제외됩니다."}), 400
        
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            service.create_mngr_sett(cd)
            conn.commit()
            return jsonify({"message": "Mngr sett created successfully."}), 201
    except ValueError as e:
        logging.warning(f"Failed to create mngr sett: {e}")
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"Error creating mngr sett: {e}", exc_info=True)
        return jsonify({"message": "Error creating mngr sett."}), 500

@bp.route('/detail/<cd>', methods=['PUT'])
@login_required
@check_password_change_required
def update_detail(cd):
    """상세 데이터를 수정합니다."""
    try:
        data = request.json
        cd_cl = data.get('cd_cl')
        if not cd_cl:
            return jsonify({"message": "cd_cl is required."}), 400
            
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            service.update_data(cd_cl, cd, data)
            conn.commit()
            return jsonify({"message": "Data updated successfully."}), 200
    except ValueError as e:
        logging.warning(f"Failed to update data: {e}")
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"Error updating data: {e}", exc_info=True)
        return jsonify({"message": "Error updating data."}), 500

@bp.route('/detail/<cd>', methods=['DELETE'])
@login_required
@check_password_change_required
def delete_detail(cd):
    """상세 데이터를 삭제합니다."""
    try:
        data = request.json
        cd_cl = data.get('cd_cl')
        if not cd_cl:
            return jsonify({"message": "cd_cl is required."}), 400
            
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            service.delete_data(cd_cl, cd)
            conn.commit()
            return jsonify({"message": "Data deleted successfully."}), 200
    except Exception as e:
        logging.error(f"Error deleting data: {e}", exc_info=True)
        return jsonify({"message": "Error deleting data."}), 500

@bp.route('/group/<cd>', methods=['PUT'])
@login_required
@check_password_change_required
def update_group(cd):
    """그룹 데이터를 수정합니다."""
    try:
        data = request.json
        cd_cl = data.get('cd_cl')
        if not cd_cl:
            return jsonify({"message": "cd_cl is required."}), 400
            
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            service.update_data(cd_cl, cd, data)
            conn.commit()
            return jsonify({"message": "Group updated successfully."}), 200
    except ValueError as e:
        logging.warning(f"Failed to update group: {e}")
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"Error updating group: {e}", exc_info=True)
        return jsonify({"message": "Error updating group."}), 500

@bp.route('/group/<cd>', methods=['DELETE'])
@login_required
@check_password_change_required
def delete_group(cd):
    """그룹 데이터를 삭제합니다. (소프트 삭제)"""
    try:
        with get_db_connection() as conn:
            service = DataDefinitionService(conn)
            service.delete_data(cd, cd)  # cd_cl과 cd가 동일
            conn.commit()
            return jsonify({"message": "Group deleted successfully."}), 200
    except Exception as e:
        logging.error(f"Error deleting group: {e}", exc_info=True)
        return jsonify({"message": "Error deleting group."}), 500
