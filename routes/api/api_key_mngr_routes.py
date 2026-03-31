from flask import Blueprint, request, jsonify
from service.api_key_mngr_service import ApiKeyMngrService

api_key_mngr_api = Blueprint('api_key_mngr_api', __name__, url_prefix='/api')

@api_key_mngr_api.route('/api_key_mngr', methods=['GET'])
def get_all_api_key_mngr():
    """모든 API 키 관리 정보 조회"""
    try:
        service = ApiKeyMngrService()
        data = service.get_all_api_key_mngr()
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/<cd>', methods=['GET'])
def get_api_key_mngr_by_cd(cd):
    """CD로 API 키 관리 정보 조회"""
    try:
        service = ApiKeyMngrService()
        data = service.get_api_key_mngr_by_cd(cd)
        if data:
            return jsonify({
                'success': True,
                'data': data
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'API 키 관리 정보를 찾을 수 없습니다.'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr', methods=['POST'])
def create_api_key_mngr():
    """API 키 관리 정보 생성"""
    try:
        data = request.json
        cd = data.get('cd')
        due = data.get('due', 1)
        start_dt = data.get('start_dt')
        api_ownr_email_addr = data.get('api_ownr_email_addr')
        
        if not cd:
            return jsonify({
                'success': False,
                'message': 'CD 값은 필수입니다.'
            }), 400
            
        service = ApiKeyMngrService()
        result = service.create_api_key_mngr(cd, due, start_dt, api_ownr_email_addr)
        
        if result:
            return jsonify({
                'success': True,
                'message': 'API 키 관리 정보가 성공적으로 생성되었습니다.'
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': 'API 키 관리 정보 생성에 실패했습니다.'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/<cd>', methods=['PUT'])
def update_api_key_mngr(cd):
    """API 키 관리 정보 업데이트"""
    try:
        data = request.json
        due = data.get('due')
        start_dt = data.get('start_dt')
        api_ownr_email_addr = data.get('api_ownr_email_addr')
        
        service = ApiKeyMngrService()
        result = service.update_api_key_mngr(cd, due, start_dt, api_ownr_email_addr)
        
        if result:
            return jsonify({
                'success': True,
                'message': 'API 키 관리 정보가 성공적으로 업데이트되었습니다.'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'API 키 관리 정보 업데이트에 실패했습니다.'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/<cd>', methods=['DELETE'])
def delete_api_key_mngr(cd):
    """API 키 관리 정보 삭제"""
    try:
        service = ApiKeyMngrService()
        result = service.delete_api_key_mngr(cd)
        
        if result:
            return jsonify({
                'success': True,
                'message': 'API 키 관리 정보가 성공적으로 삭제되었습니다.'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'API 키 관리 정보 삭제에 실패했습니다.'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/update_cds', methods=['POST'])
def update_cd_from_mngr_sett():
    """TB_MNGR_SETT에서 CD 값을 가져와 TB_API_KEY_MNGR에 없는 CD를 추가"""
    try:
        service = ApiKeyMngrService()
        added_count = service.update_cd_from_mngr_sett()
        
        return jsonify({
            'success': True,
            'message': f'TB_API_KEY_MNGR에 {added_count}개의 CD 값을 추가했습니다.',
            'added_count': added_count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

