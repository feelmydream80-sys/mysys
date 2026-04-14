# routes/api/popup_routes.py
"""
API routes for popup management.
"""
from flask import Blueprint, request, jsonify, session
import logging
import os
import uuid
from functools import wraps
from datetime import datetime

from msys.database import get_db_connection
from service.popup_service import PopupService
from utils.datetime_utils import convert_datetime_fields_to_kst_str

popup_api_bp = Blueprint('popup_api', __name__, url_prefix='/api/popups')

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
        
        with get_db_connection() as conn:
            popup_service = PopupService(conn)
            popups = popup_service.get_all_popups(include_inactive)
            
            # Convert datetime objects to KST strings before jsonify
            convert_datetime_fields_to_kst_str(popups)
            
            # None 값을 빈 문자열로 변환
            for popup in popups:
                for key, value in popup.items():
                    if value is None:
                        popup[key] = ''
            
            return jsonify(popups), 200
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
    
    Request Body:
        title (str): Popup title
        content (str): Popup content
        start_time (str): Start time in 'YYYY-MM-DD HH:MM:SS' format
        end_time (str): End time in 'YYYY-MM-DD HH:MM:SS' format
        use_yn (str, optional): 'Y' or 'N', defaults to 'Y'
    
    Returns:
        JSON with created popup ID and success message.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"message": "요청 데이터가 없습니다."}), 400
        
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
    
    Request Body:
        title (str): Popup title
        content (str): Popup content
        start_time (str): Start time in 'YYYY-MM-DD HH:MM:SS' format
        end_time (str): End time in 'YYYY-MM-DD HH:MM:SS' format
        use_yn (str): 'Y' or 'N'
    
    Returns:
        JSON with success message.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"message": "요청 데이터가 없습니다."}), 400
        
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
