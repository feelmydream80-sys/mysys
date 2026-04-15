# routes/api/popup_routes.py
"""
API routes for popup management.
"""
from flask import Blueprint, request, jsonify, session
import logging
import os
import uuid
import re
from functools import wraps
from datetime import datetime

from msys.database import get_db_connection
from service.popup_service import PopupService
from utils.datetime_utils import convert_datetime_fields_to_kst_str

popup_api_bp = Blueprint('popup_api', __name__, url_prefix='/api/popups')

def validate_and_convert_datetime(date_str, field_name):
    """
    날짜 문자열 검증 및 변환
    
    Args:
        date_str: 날짜 문자열 (YYYY-MM-DD HH:MM:SS)
        field_name: 필드명 (로깅용)
    
    Returns:
        변환된 datetime 객체 또는 None (유효하지 않은 경우)
    """
    if not date_str:
        logging.warning(f"⚠️ {field_name} 값이 비어있습니다.")
        return None
    
    # YYYY-MM-DD HH:MM:SS 형식 검증
    pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
    if not re.match(pattern, date_str.strip()):
        logging.warning(f"⚠️ {field_name} 형식 오류: '{date_str}' (YYYY-MM-DD HH:MM:SS 필요)")
        return None
    
    try:
        dt = datetime.strptime(date_str.strip(), '%Y-%m-%d %H:%M:%S')
        return dt
    except ValueError as e:
        logging.warning(f"⚠️ {field_name} 변환 오류: '{date_str}' - {e}")
        return None

def login_required_api(f):
    """Decorator to check if user is logged in for API endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': '로그인이 필요합니다.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required_api(f):
    """Decorator to check if user has admin permissions for API endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_permissions = session.get('user', {}).get('permissions', [])
        if 'mngr_sett' not in user_permissions:
            return jsonify({'error': '관리자 권한이 필요합니다.'}), 403
        return f(*args, **kwargs)
    return decorated_function

@popup_api_bp.route('', methods=['GET'])
@login_required_api
@admin_required_api
def get_all_popups():
    """
    Get all popups (admin only).
    
    Query Parameters:
        include_inactive (bool): Include inactive popups if 'true'.
    
    Returns:
        JSON list of all popups.
    """
    try:
        include_inactive_str = request.args.get('include_inactive', 'false')
        include_inactive = include_inactive_str.lower() == 'true'
        
        logging.info(f"🔍 [PIPELINE] GET /api/popups - include_inactive={include_inactive}")

        with get_db_connection() as conn:
            popup_service = PopupService(conn)
            popups = popup_service.get_all_popups(include_inactive)
            
            logging.info(f"🔍 [PIPELINE] DAO에서 조회된 팝업 수: {len(popups)}")
            if popups:
                logging.info(f"🔍 [PIPELINE] 첫 번째 팝업 데이터: {popups[0]}")

            # Convert datetime objects to KST strings before jsonify
            convert_datetime_fields_to_kst_str(popups)

            # None 값을 빈 문자열로 변환
            for popup in popups:
                for key, value in popup.items():
                    if value is None:
                        popup[key] = ''
            
            logging.info(f"🔍 [PIPELINE] 변환 후 응답 데이터: popups={len(popups)}개")

            # Frontend와 호환되는 응답 구조로 변경 (popups, total)
            return jsonify({
                "popups": popups,
                "total": len(popups)
            }), 200
    except Exception as e:
        logging.error(f"❌ API: 팝업 목록 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "팝업 목록 조회 중 오류가 발생했습니다."}), 500

@popup_api_bp.route('/active', methods=['GET'])
@login_required_api
def get_active_popups():
    """
    Get active popups for current user.
    
    Returns:
        JSON list of active popups currently visible.
    """
    try:
        with get_db_connection() as conn:
            popup_service = PopupService(conn)
            popups = popup_service.get_active_popups()
            
            # Convert datetime objects to KST strings before jsonify
            convert_datetime_fields_to_kst_str(popups)
            
            # None 값을 빈 문자열로 변환
            for popup in popups:
                for key, value in popup.items():
                    if value is None:
                        popup[key] = ''
            
            return jsonify(popups), 200
    except Exception as e:
        logging.error(f"❌ API: 활성 팝업 조회 실패: {e}", exc_info=True)
        return jsonify({"message": "활성 팝업 조회 중 오류가 발생했습니다."}), 500

@popup_api_bp.route('/<int:popup_id>', methods=['GET'])
@login_required_api
def get_popup(popup_id):
    """
    Get a single popup by ID.
    
    Args:
        popup_id: The ID of the popup to retrieve.
    
    Returns:
        JSON popup object if found.
    """
    try:
        with get_db_connection() as conn:
            popup_service = PopupService(conn)
            popup = popup_service.get_popup_by_id(popup_id)
            
            if not popup:
                return jsonify({"message": "팝업을 찾을 수 없습니다."}), 404
            
            # Convert datetime objects to KST strings before jsonify
            convert_datetime_fields_to_kst_str(popup)
            
            # None 값을 빈 문자열로 변환
            for key, value in popup.items():
                if value is None:
                    popup[key] = ''
            
            return jsonify(popup), 200
    except Exception as e:
        logging.error(f"❌ API: 팝업 조회 실패 (ID: {popup_id}): {e}", exc_info=True)
        return jsonify({"message": "팝업 조회 중 오류가 발생했습니다."}), 500

@popup_api_bp.route('', methods=['POST'])
@login_required_api
@admin_required_api
def create_popup():
    """
    Create a new popup (admin only).
    
    Request Body (multipart/form-data):
        titl (str): Popup title (DB: TITL)
        cont (str): Popup content (DB: CONT)
        start_dt (str): Start time in 'YYYY-MM-DD HH:MM:SS' format (DB: START_DT)
        end_dt (str): End time in 'YYYY-MM-DD HH:MM:SS' format (DB: END_DT)
        use_yn (str, optional): 'Y' or 'N', defaults to 'Y' (DB: USE_YN)
        lnk_url (str, optional): Link URL (DB: LNK_URL)
        disp_ord (int, optional): Display order (DB: DISP_ORD)
        disp_type (str, optional): 'MODAL' or 'BANNER' (DB: DISP_TYPE)
        width (int, optional): Popup width (DB: WIDTH)
        height (int, optional): Popup height (DB: HEIGHT)
        bg_colr (str, optional): Background color (DB: BG_COLR)
        hide_opt_yn (str, optional): 'Y' or 'N' (DB: HIDE_OPT_YN)
        hide_days_max (int, optional): Max hide days (DB: HIDE_DAYS_MAX)
        image (file, optional): Image file
    
    Returns:
        JSON with created popup ID and success message.
    """
    try:
        # Process form data from multipart/form-data
        # Field names match DB column names (lowercase)
        logging.info(f"🔍 API: Received form data keys: {list(request.form.keys())}")
        logging.info(f"🔍 API: Received files: {list(request.files.keys())}")
        
        # 날짜 검증 및 변환
        start_dt_str = request.form.get('start_dt')
        end_dt_str = request.form.get('end_dt')
        
        start_dt = validate_and_convert_datetime(start_dt_str, 'start_dt')
        end_dt = validate_and_convert_datetime(end_dt_str, 'end_dt')
        
        if not start_dt:
            return jsonify({"message": "시작일 형식이 올바르지 않습니다. (YYYY-MM-DD HH:MM:SS)"}), 400
        if not end_dt:
            return jsonify({"message": "종료일 형식이 올바르지 않습니다. (YYYY-MM-DD HH:MM:SS)"}), 400
        
        if start_dt >= end_dt:
            return jsonify({"message": "시작일은 종료일보다 이전이어야 합니다."}), 400
        
        data = {
            'TITL': request.form.get('titl'),
            'CONT': request.form.get('cont'),
            'START_DT': start_dt.strftime('%Y-%m-%d %H:%M:%S'),
            'END_DT': end_dt.strftime('%Y-%m-%d %H:%M:%S'),
            'USE_YN': request.form.get('use_yn', 'Y'),
            'LNK_URL': request.form.get('lnk_url'),
            'DISP_ORD': request.form.get('disp_ord', 999),
            'DISP_TYPE': request.form.get('disp_type', 'MODAL'),
            'WIDTH': request.form.get('width', 500),
            'HEIGHT': request.form.get('height'),
            'BG_COLR': request.form.get('bg_colr', '#FFFFFF'),
            'HIDE_OPT_YN': request.form.get('hide_opt_yn', 'Y'),
            'HIDE_DAYS_MAX': request.form.get('hide_days_max', 7)
        }
        
        logging.info(f"🔍 API: Processed data TITL='{data['TITL']}', START_DT='{data['START_DT']}', END_DT='{data['END_DT']}'")
        
        # Handle image file upload
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                # Check file extension
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
                file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
                
                if file_ext not in allowed_extensions:
                    return jsonify({"message": "허용되지 않는 파일 형식입니다. (png, jpg, jpeg, gif만 가능)"}), 400
                
                # Check file size (5MB = 5 * 1024 * 1024 bytes)
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)
                
                if file_size > 5 * 1024 * 1024:
                    return jsonify({"message": "파일 크기는 5MB를 초과할 수 없습니다."}), 400
                
                # Generate unique filename
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_id = str(uuid.uuid4())[:8]
                new_filename = f"popup_{timestamp}_{unique_id}.{file_ext}"
                
                # Save file
                upload_folder = os.path.join('static', 'uploads', 'popups')
                os.makedirs(upload_folder, exist_ok=True)
                
                file_path = os.path.join(upload_folder, new_filename)
                file.save(file_path)
                
                # Set image path
                data['IMG_PATH'] = f"/static/uploads/popups/{new_filename}"
        
        # Validate required fields
        required_fields = ['TITL', 'CONT', 'START_DT', 'END_DT']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"message": f"필수 항목 '{field}'이(가) 누락되었습니다."}), 400
        
        # Get current user ID
        user_id = session.get('user', {}).get('user_id')
        
        with get_db_connection() as conn:
            popup_service = PopupService(conn)
            popup_id = popup_service.create_popup(data, user_id)
            
            return jsonify({
                "message": "팝업이 성공적으로 생성되었습니다.",
                "popup_id": popup_id
            }), 201
    except ValueError as e:
        logging.warning(f"⚠️ API: 팝업 생성 실패 - {e}")
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        logging.error(f"❌ API: 팝업 생성 실패: {e}", exc_info=True)
        return jsonify({"message": "팝업 생성 중 오류가 발생했습니다."}), 500

@popup_api_bp.route('/<int:popup_id>', methods=['PUT'])
@login_required_api
@admin_required_api
def update_popup(popup_id):
    """
    Update an existing popup (admin only).
    
    Args:
        popup_id: The ID of the popup to update.
    
    Request Body (multipart/form-data):
        titl (str): Popup title (DB: TITL)
        cont (str): Popup content (DB: CONT)
        start_dt (str): Start time in 'YYYY-MM-DD HH:MM:SS' format (DB: START_DT)
        end_dt (str): End time in 'YYYY-MM-DD HH:MM:SS' format (DB: END_DT)
        use_yn (str): 'Y' or 'N' (DB: USE_YN)
        lnk_url (str, optional): Link URL (DB: LNK_URL)
        disp_ord (int, optional): Display order (DB: DISP_ORD)
        disp_type (str, optional): 'MODAL' or 'BANNER' (DB: DISP_TYPE)
        width (int, optional): Popup width (DB: WIDTH)
        height (int, optional): Popup height (DB: HEIGHT)
        bg_colr (str, optional): Background color (DB: BG_COLR)
        hide_opt_yn (str, optional): 'Y' or 'N' (DB: HIDE_OPT_YN)
        hide_days_max (int, optional): Max hide days (DB: HIDE_DAYS_MAX)
        image (file, optional): Image file
    
    Returns:
        JSON with success message.
    """
    try:
        # Process form data from multipart/form-data
        # Field names match DB column names (lowercase)
        
        # 날짜 검증 및 변환
        start_dt_str = request.form.get('start_dt')
        end_dt_str = request.form.get('end_dt')
        
        start_dt = validate_and_convert_datetime(start_dt_str, 'start_dt')
        end_dt = validate_and_convert_datetime(end_dt_str, 'end_dt')
        
        if not start_dt:
            return jsonify({"message": "시작일 형식이 올바르지 않습니다. (YYYY-MM-DD HH:MM:SS)"}), 400
        if not end_dt:
            return jsonify({"message": "종료일 형식이 올바르지 않습니다. (YYYY-MM-DD HH:MM:SS)"}), 400
        
        if start_dt >= end_dt:
            return jsonify({"message": "시작일은 종료일보다 이전이어야 합니다."}), 400
        
        data = {
            'TITL': request.form.get('titl'),
            'CONT': request.form.get('cont'),
            'START_DT': start_dt.strftime('%Y-%m-%d %H:%M:%S'),
            'END_DT': end_dt.strftime('%Y-%m-%d %H:%M:%S'),
            'USE_YN': request.form.get('use_yn', 'Y'),
            'LNK_URL': request.form.get('lnk_url'),
            'DISP_ORD': request.form.get('disp_ord', 999),
            'DISP_TYPE': request.form.get('disp_type', 'MODAL'),
            'WIDTH': request.form.get('width', 500),
            'HEIGHT': request.form.get('height'),
            'BG_COLR': request.form.get('bg_colr', '#FFFFFF'),
            'HIDE_OPT_YN': request.form.get('hide_opt_yn', 'Y'),
            'HIDE_DAYS_MAX': request.form.get('hide_days_max', 7)
        }
        
        # Handle image file upload
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                # Check file extension
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
                file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
                
                if file_ext not in allowed_extensions:
                    return jsonify({"message": "허용되지 않는 파일 형식입니다. (png, jpg, jpeg, gif만 가능)"}), 400
                
                # Check file size (5MB = 5 * 1024 * 1024 bytes)
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)
                
                if file_size > 5 * 1024 * 1024:
                    return jsonify({"message": "파일 크기는 5MB를 초과할 수 없습니다."}), 400
                
                # Generate unique filename
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_id = str(uuid.uuid4())[:8]
                new_filename = f"popup_{timestamp}_{unique_id}.{file_ext}"
                
                # Save file
                upload_folder = os.path.join('static', 'uploads', 'popups')
                os.makedirs(upload_folder, exist_ok=True)
                
                file_path = os.path.join(upload_folder, new_filename)
                file.save(file_path)
                
                # Set image path
                data['IMG_PATH'] = f"/static/uploads/popups/{new_filename}"
        
        # Validate required fields
        required_fields = ['TITL', 'CONT', 'START_DT', 'END_DT']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"message": f"필수 항목 '{field}'이(가) 누락되었습니다."}), 400
        
        # Get current user ID
        user_id = session.get('user', {}).get('user_id')
        
        with get_db_connection() as conn:
            popup_service = PopupService(conn)
            popup_service.update_popup(popup_id, data, user_id)
            
            return jsonify({
                "message": "팝업이 성공적으로 업데이트되었습니다.",
                "popup_id": popup_id
            }), 200
    except ValueError as e:
        logging.warning(f"⚠️ API: 팝업 업데이트 실패 - {e}")
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        logging.error(f"❌ API: 팝업 업데이트 실패 (ID: {popup_id}): {e}", exc_info=True)
        return jsonify({"message": "팝업 업데이트 중 오류가 발생했습니다."}), 500

@popup_api_bp.route('/<int:popup_id>', methods=['DELETE'])
@login_required_api
@admin_required_api
def delete_popup(popup_id):
    """
    Delete a popup (admin only, soft delete).
    
    Args:
        popup_id: The ID of the popup to delete.
    
    Returns:
        JSON with success message.
    """
    try:
        # Get current user ID
        user_id = session.get('user', {}).get('user_id')
        
        with get_db_connection() as conn:
            popup_service = PopupService(conn)
            popup_service.delete_popup(popup_id, user_id)
            
            return jsonify({
                "message": "팝업이 성공적으로 삭제되었습니다.",
                "popup_id": popup_id
            }), 200
    except ValueError as e:
        logging.warning(f"⚠️ API: 팝업 삭제 실패 - {e}")
        return jsonify({"message": str(e)}), 404
    except Exception as e:
        logging.error(f"❌ API: 팝업 삭제 실패 (ID: {popup_id}): {e}", exc_info=True)
        return jsonify({"message": "팝업 삭제 중 오류가 발생했습니다."}), 500

@popup_api_bp.route('/upload', methods=['POST'])
@login_required_api
@admin_required_api
def upload_image():
    """
    Upload an image for popup.
    
    Request:
        file: Image file (multipart/form-data)
    
    Returns:
        JSON with image path and success message.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"message": "파일이 없습니다."}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"message": "파일이 선택되지 않았습니다."}), 400
        
        # Check file extension
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({"message": "허용되지 않는 파일 형식입니다. (png, jpg, jpeg, gif만 가능)"}), 400
        
        # Check file size (5MB = 5 * 1024 * 1024 bytes)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > 5 * 1024 * 1024:
            return jsonify({"message": "파일 크기는 5MB를 초과할 수 없습니다."}), 400
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        new_filename = f"popup_{timestamp}_{unique_id}.{file_ext}"
        
        # Save file
        upload_folder = os.path.join('static', 'uploads', 'popups')
        os.makedirs(upload_folder, exist_ok=True)
        
        file_path = os.path.join(upload_folder, new_filename)
        file.save(file_path)
        
        # Return relative path for database storage
        image_path = f"/static/uploads/popups/{new_filename}"
        
        logging.info(f"✅ API: 이미지 업로드 성공 - {new_filename}")
        
        return jsonify({
            "message": "이미지가 성공적으로 업로드되었습니다.",
            "image_path": image_path,
            "filename": new_filename
        }), 200
        
    except Exception as e:
        logging.error(f"❌ API: 이미지 업로드 실패: {e}", exc_info=True)
        return jsonify({"message": "이미지 업로드 중 오류가 발생했습니다."}), 500
