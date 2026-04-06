from flask import Blueprint, request, jsonify
from service.api_key_mngr_service import ApiKeyMngrService
from service.mail_scheduler_service import MailSchedulerService
from ..auth_routes import login_required, check_password_change_required, api_key_mngr_required
import logging

logger = logging.getLogger(__name__)

api_key_mngr_api = Blueprint('api_key_mngr_api', __name__, url_prefix='/api')

@api_key_mngr_api.route('/api_key_mngr', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
def get_all_api_key_mngr():
    """모든 API 키 관리 정보 조회"""
    try:
        logger.info("[API키관리] API 요청 수신 - /api/api_key_mngr")
        service = ApiKeyMngrService()
        data = service.get_all_api_key_mngr()
        logger.info(f"[API키관리] 서비스 응답 - 데이터 건수: {len(data)}")
        response = jsonify({
            'success': True,
            'data': data
        })
        logger.info(f"[API키관리] 응답 전송 - status: 200, 데이터 크기: {len(str(data))} bytes")
        return response, 200
    except Exception as e:
        logger.error(f"[API키관리] 예외 발생: {type(e).__name__}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/<cd>', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
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
@login_required
@check_password_change_required
@api_key_mngr_required
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
@login_required
@check_password_change_required
@api_key_mngr_required
def update_api_key_mngr(cd):
    """API 키 관리 정보 업데이트 (TB_API_KEY_MNGR + TB_CON_MST ITEM10)"""
    try:
        data = request.json
        due = data.get('due')
        start_dt = data.get('start_dt')
        api_ownr_email_addr = data.get('api_ownr_email_addr')
        api_key = data.get('api_key')
        
        service = ApiKeyMngrService()
        result = service.update_api_key_mngr_with_api_key(cd, due, start_dt, api_ownr_email_addr, api_key)
        
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
@login_required
@check_password_change_required
@api_key_mngr_required
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
@login_required
@check_password_change_required
@api_key_mngr_required
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

@api_key_mngr_api.route('/api_key_mngr/send_email', methods=['POST'])
@login_required
@check_password_change_required
@api_key_mngr_required
def send_api_key_expiry_email():
    """선택된 API 키에 대해 만료 알림 메일 발송"""
    try:
        data = request.json
        cds = data.get('cds', [])
        
        if not cds:
            return jsonify({
                'success': False,
                'message': 'CD 목록이 필요합니다.'
            }), 400
        
        service = ApiKeyMngrService()
        results = service.send_expiry_notification(cds)
        
        # 결과 요약
        success_count = len(results['success'])
        failed_count = len(results['failed'])
        skipped_count = len(results['skipped'])
        
        message = f'메일 발송 완료: 성공 {success_count}건'
        if failed_count > 0:
            message += f', 실패 {failed_count}건'
        if skipped_count > 0:
            message += f', 건너뜀 {skipped_count}건'
        
        return jsonify({
            'success': True,
            'message': message,
            'results': results
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/mail_settings', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
def get_mail_settings():
    """메일 설정 조회"""
    try:
        service = ApiKeyMngrService()
        settings = service.get_mail_settings()
        return jsonify({
            'success': True,
            'settings': settings
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/mail_settings', methods=['POST'])
@login_required
@check_password_change_required
@api_key_mngr_required
def save_mail_settings():
    """메일 설정 저장"""
    try:
        data = request.json
        service = ApiKeyMngrService()
        result = service.save_mail_settings(data)
        
        if result:
            return jsonify({
                'success': True,
                'message': '메일 설정이 저장되었습니다.'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': '메일 설정 저장에 실패했습니다.'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@api_key_mngr_api.route('/api_key_mngr/event_log', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
def get_event_log():
    """이벤트 이력 조회"""
    try:
        service = ApiKeyMngrService()
        logs = service.get_event_logs()
        return jsonify({
            'success': True,
            'logs': logs
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ==========================================
# 메일 전송 이력 관련 API (신규 추가)
# ==========================================

@api_key_mngr_api.route('/api_key_mngr/mail_send_history', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
def get_mail_send_history():
    """메일 전송 이력 조회 (페이지네이션 + 필터)"""
    try:
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 50, type=int)
        cd = request.args.get('cd', None)
        mail_tp = request.args.get('mail_tp', None)
        success = request.args.get('success', None)
        
        if success is not None:
            success = success.lower() == 'true'
        
        service = MailSchedulerService()
        result = service.get_mail_send_history(
            page=page,
            page_size=page_size,
            cd=cd,
            mail_tp=mail_tp,
            success=success
        )
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ==========================================
# 스케줄러 메일 발송 API (신규 추가)
# ==========================================

@api_key_mngr_api.route('/api_key_mngr/send_scheduled_mails', methods=['POST'])
@login_required
@check_password_change_required
@api_key_mngr_required
def send_scheduled_mails():
    """스케줄에 따른 메일 발송 (수동 실행용)"""
    try:
        data = request.json or {}
        target_cds = data.get('target_cds', None)
        exclude_cds = data.get('exclude_cds', None)
        
        service = MailSchedulerService()
        result = service.check_and_send_scheduled_mails(
            target_cds=target_cds,
            exclude_cds=exclude_cds
        )
        
        # 결과 요약
        success_count = len(result['success'])
        failed_count = len(result['failed'])
        skipped_count = len(result['skipped'])
        
        message = f'스케줄 메일 발송 완료: 성공 {success_count}건'
        if failed_count > 0:
            message += f', 실패 {failed_count}건'
        if skipped_count > 0:
            message += f', 건너뜀 {skipped_count}건'
        
        return jsonify({
            'success': True,
            'message': message,
            'results': result
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ==========================================
# 스케줄 설정 관련 API (신규 추가)
# ==========================================

@api_key_mngr_api.route('/api_key_mngr/schedule_settings', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
def get_schedule_settings():
    """스케줄 설정 조회"""
    try:
        service = MailSchedulerService()
        settings = service.get_schedule_settings()
        return jsonify({
            'success': True,
            'settings': settings
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@api_key_mngr_api.route('/api_key_mngr/schedule_settings', methods=['POST'])
@login_required
@check_password_change_required
@api_key_mngr_required
def save_schedule_settings():
    """스케줄 설정 저장 (3개 스케줄 일괄 처리)"""
    try:
        data = request.json
        # 배열 또는 단일 객체 모두 지원
        if isinstance(data, list):
            schedules = data
        else:
            schedules = [data]
        
        service = MailSchedulerService()
        result = service.save_schedule_settings(schedules)
        
        if result:
            return jsonify({
                'success': True,
                'message': '스케줄 설정이 저장되었습니다.'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': '스케줄 설정 저장에 실패했습니다.'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ==========================================
# 메일 설정 이력 조회 API (신규 추가)
# ==========================================

@api_key_mngr_api.route('/api_key_mngr/mail_setting_history', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
def get_mail_setting_history():
    """메일 설정 이력 조회 (과거 버전)"""
    try:
        mail_tp = request.args.get('mail_tp', '')
        version = request.args.get('version', 1, type=int)
        
        service = MailSchedulerService()
        result = service.get_mail_setting_history(mail_tp, version)
        
        if result['success']:
            return jsonify({
                'success': True,
                'data': result['data']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result.get('message', '설정을 불러오지 못했습니다.')
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@api_key_mngr_api.route('/api_key_mngr/mail_setting_history_count', methods=['GET'])
@login_required
@check_password_change_required
@api_key_mngr_required
def get_mail_setting_history_count():
    """메일 설정 이력 개수 조회"""
    try:
        mail_tp = request.args.get('mail_tp', '')
        
        service = MailSchedulerService()
        count = service.get_mail_setting_history_count(mail_tp)
        
        return jsonify({
            'success': True,
            'count': count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


# ==========================================
# 테스트 메일 발송 API (신규 추가)
# ==========================================

@api_key_mngr_api.route('/api_key_mngr/send_test_mail', methods=['POST'])
@login_required
@check_password_change_required
@api_key_mngr_required
def send_test_mail():
    """테스트 메일 발송"""
    try:
        data = request.json
        test_email = data.get('test_email', '')
        
        if not test_email:
            return jsonify({
                'success': False,
                'message': '테스트 수신 이메일을 입력해주세요.'
            }), 400
        
        service = MailSchedulerService()
        result = service.send_test_mail(test_email)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result.get('message', '테스트 메일이 발송되었습니다.')
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result.get('message', '테스트 메일 발송에 실패했습니다.')
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

