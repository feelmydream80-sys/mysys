"""
메일 스케줄러 서비스
API 키 만료 알림 메일을 스케줄에 따라 자동 발송
"""
from dao.api_key_mngr_dao import ApiKeyMngrDao
from service.api_key_mngr_service import ApiKeyMngrService
from mail_send import send_email, create_api_key_expiry_email, validate_email_address
from datetime import datetime, date, timedelta
import logging
import json

logger = logging.getLogger(__name__)


class MailSchedulerService:
    """메일 스케줄러 서비스 클래스"""

    def __init__(self):
        self.dao = ApiKeyMngrDao()
        self.api_key_service = ApiKeyMngrService()
        self.logger = logger

    def check_and_send_scheduled_mails(self, target_cds=None, exclude_cds=None):
        """
        스케줄에 따라 메일 발송 체크 및 실행
        
        발송 규칙:
        - 30일 전: 1회만 발송
        - 29~8일 전: 발송 안 함
        - 7일 전 ~ 1일 전: 매일 발송
        - 당일 (0일): 1회만 발송
        - 당일 이후: 발송 안 함
        - 서버 문제로 못 보낸 경우: 다음 실행 시 재시도
        
        :param target_cds: 발송 대상 CD 목록 (None이면 전체)
        :param exclude_cds: 제외 대상 CD 목록
        :return: 발송 결과 dict
        """
        today = date.today()
        results = {
            'success': [],
            'failed': [],
            'skipped': [],
            'executed_at': datetime.now().isoformat()
        }
        
        try:
            # 모든 API 키 데이터 조회
            all_data = self.api_key_service.get_all_api_key_mngr()
            
            # 대상 CD 필터링
            if target_cds:
                all_data = [item for item in all_data if item['cd'] in target_cds]
            
            # 제외 CD 필터링
            if exclude_cds:
                all_data = [item for item in all_data if item['cd'] not in exclude_cds]
            
            # 메일 설정 가져오기
            mail_settings = {}
            try:
                settings_list = self.dao.select_mail_settings()
                for s in settings_list:
                    mail_settings[s['mail_tp']] = {
                        'subject': s.get('subject', ''),
                        'body': s.get('body', '')
                    }
            except Exception as e:
                self.logger.warning(f"Failed to load mail settings: {e}")
            
            for api_key_data in all_data:
                cd = api_key_data['cd']
                days_remaining = api_key_data.get('days_remaining', 999)
                email_addr = api_key_data.get('api_ownr_email_addr', '')
                
                # 발송 대상 메일 유형 결정
                mail_tp = self._determine_mail_type(days_remaining)
                
                if mail_tp is None:
                    # 발송 대상 아님
                    results['skipped'].append({
                        'cd': cd,
                        'days_remaining': days_remaining,
                        'reason': 'Not in mailing window'
                    })
                    continue
                
                # 이메일 주소 유효성 검사
                if not validate_email_address(email_addr):
                    results['skipped'].append({
                        'cd': cd,
                        'reason': f'Invalid email: {email_addr}'
                    })
                    continue
                
                # 오늘 발송 이력 확인 (중복 발송 방지)
                try:
                    send_log = self.dao.get_mail_send_log(cd, mail_tp, today)
                    if send_log:
                        # 이미 오늘 발송함 - 스킵
                        results['skipped'].append({
                            'cd': cd,
                            'mail_tp': mail_tp,
                            'reason': 'Already sent today'
                        })
                        continue
                except Exception as e:
                    self.logger.warning(f"Failed to check send log for CD {cd}: {e}")
                
                # 메일 발송
                try:
                    mail_setting = mail_settings.get(mail_tp, {})
                    subject_template = mail_setting.get('subject', None) or None
                    body_template = mail_setting.get('body', None) or None
                    
                    subject, body = create_api_key_expiry_email(
                        api_key_data,
                        subject_template=subject_template,
                        body_template=body_template
                    )
                    
                    success = send_email(
                        to=email_addr,
                        subject=subject,
                        html_content=body
                    )
                    
                    # 발송 이력 기록
                    self.dao.insert_mail_send_log(
                        cd=cd,
                        mail_tp=mail_tp,
                        sent_dt=today,
                        success=success,
                        error_msg=None if success else 'send_email returned False'
                    )
                    
                    if success:
                        self.logger.info(f"Email sent successfully for CD: {cd} ({mail_tp}) to {email_addr}")
                        results['success'].append({
                            'cd': cd,
                            'mail_tp': mail_tp,
                            'email': email_addr,
                            'days_remaining': days_remaining
                        })
                    else:
                        results['failed'].append({
                            'cd': cd,
                            'mail_tp': mail_tp,
                            'reason': 'send_email returned False'
                        })
                        
                except Exception as e:
                    error_msg = str(e)
                    self.logger.error(f"Failed to send email for CD {cd}: {error_msg}")
                    
                    # 실패 이력도 기록 (재시도용)
                    try:
                        self.dao.insert_mail_send_log(
                            cd=cd,
                            mail_tp=mail_tp,
                            sent_dt=today,
                            success=False,
                            error_msg=error_msg
                        )
                    except:
                        pass
                    
                    results['failed'].append({
                        'cd': cd,
                        'mail_tp': mail_tp,
                        'reason': error_msg
                    })
            
            # 결과 요약 로깅
            self.logger.info(
                f"Mail scheduler completed: "
                f"success={len(results['success'])}, "
                f"failed={len(results['failed'])}, "
                f"skipped={len(results['skipped'])}"
            )
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error in check_and_send_scheduled_mails: {str(e)}")
            raise

    def _determine_mail_type(self, days_remaining):
        """
        남은 기간에 따라 발송할 메일 유형 결정
        
        규칙:
        - 30일 전: mail30 (1회)
        - 7~1일 전: mail7 (매일)
        - 당일: mail0 (1회)
        - 그 외: None (발송 안 함)
        
        :param days_remaining: 남은 일수
        :return: mail_tp ('mail30', 'mail7', 'mail0') or None
        """
        if days_remaining == 30:
            return 'mail30'
        elif 1 <= days_remaining <= 7:
            return 'mail7'
        elif days_remaining == 0:
            return 'mail0'
        else:
            return None

    def get_mail_send_history(self, page=1, page_size=50, cd=None, mail_tp=None, success=None):
        """
        메일 전송 이력 조회
        
        :param page: 페이지 번호
        :param page_size: 페이지당 항목 수
        :param cd: 필터 - CD
        :param mail_tp: 필터 - 메일 유형
        :param success: 필터 - 성공 여부
        :return: 이력 목록 및 페이지 정보
        """
        try:
            offset = (page - 1) * page_size
            logs = self.dao.select_mail_send_logs(
                page_size=page_size,
                offset=offset,
                cd=cd,
                mail_tp=mail_tp,
                success=success
            )
            total_count = self.dao.count_mail_send_logs(
                cd=cd,
                mail_tp=mail_tp,
                success=success
            )
            total_pages = (total_count + page_size - 1) // page_size
            
            return {
                'logs': logs,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': total_pages
                }
            }
        except Exception as e:
            self.logger.error(f"Error getting mail send history: {e}")
            raise

    def get_schedule_settings(self):
        """스케줄 설정 조회"""
        try:
            return self.dao.select_schedule_settings()
        except Exception as e:
            self.logger.error(f"Error getting schedule settings: {e}")
            raise

    def save_schedule_settings(self, settings):
        """스케줄 설정 저장"""
        try:
            self.dao.upsert_schedule_settings(settings)
            return True
        except Exception as e:
            self.logger.error(f"Error saving schedule settings: {e}")
            raise

    def update_schedule_last_run(self, schd_id, result):
        """스케줄 마지막 실행 정보 업데이트"""
        try:
            self.dao.update_schedule_last_run(schd_id, result)
            return True
        except Exception as e:
            self.logger.error(f"Error updating schedule last run: {e}")
            raise

    def send_test_mail(self, test_email):
        """
        테스트 메일 발송
        
        :param test_email: 테스트 수신 이메일 주소
        :return: 발송 결과 dict
        """
        try:
            # 이메일 유효성 검사
            if not validate_email_address(test_email):
                return {
                    'success': False,
                    'message': f'올바르지 않은 이메일 형식입니다: {test_email}'
                }
            
            # 테스트 메일 내용 생성
            subject = '[테스트] API 키 관리 시스템 메일 발송 테스트'
            body = f'''
            <html>
            <body>
                <h2>API 키 관리 시스템 - 테스트 메일</h2>
                <p>이 메일은 API 키 관리 시스템의 메일 발송 기능을 테스트하기 위해 발송되었습니다.</p>
                <hr>
                <p><strong>발송 시간:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p><strong>수신 이메일:</strong> {test_email}</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    이 메일은 자동으로 발송된 테스트 메일입니다.<br>
                    API 키 관리 시스템 관리팀
                </p>
            </body>
            </html>
            '''
            
            # 메일 발송
            success = send_email(
                to=test_email,
                subject=subject,
                html_content=body
            )
            
            # 발송 이력 기록
            try:
                self.dao.insert_mail_send_log(
                    cd='TEST',
                    mail_tp='test',
                    sent_dt=date.today(),
                    success=success,
                    error_msg=None if success else 'send_email returned False'
                )
            except Exception as log_err:
                self.logger.warning(f"Failed to record test mail log: {log_err}")
            
            if success:
                self.logger.info(f"Test email sent successfully to: {test_email}")
                return {
                    'success': True,
                    'message': f'테스트 메일이 발송되었습니다: {test_email}'
                }
            else:
                return {
                    'success': False,
                    'message': '메일 발송에 실패했습니다. (send_email returned False)'
                }
                
        except Exception as e:
            error_msg = str(e)
            self.logger.error(f"Failed to send test email to {test_email}: {error_msg}")
            return {
                'success': False,
                'message': f'테스트 메일 발송 중 오류가 발생했습니다: {error_msg}'
            }

    def get_mail_setting_history(self, mail_tp, version):
        """
        메일 설정 이력 조회 (과거 버전)
        
        :param mail_tp: 메일 유형 (mail30, mail7, mail0)
        :param version: 버전 번호 (1=최신에서 1번째 전, 2=2번째 전, 3=3번째 전)
        :return: 설정 데이터 dict
        """
        try:
            # DAO에서 이력 조회
            result = self.dao.get_mail_setting_history(mail_tp, version)
            
            if result:
                return {
                    'success': True,
                    'data': {
                        'subject': result.get('subject', ''),
                        'from_email': result.get('from_email', ''),
                        'body': result.get('body', ''),
                        'reg_dt': result.get('reg_dt', '')
                    }
                }
            else:
                return {
                    'success': False,
                    'message': f'{mail_tp}의 버전 {version} 설정을 찾을 수 없습니다.'
                }
        except Exception as e:
            error_msg = str(e)
            self.logger.error(f"Failed to get mail setting history for {mail_tp} version {version}: {error_msg}")
            return {
                'success': False,
                'message': f'설정 이력 조회 중 오류가 발생했습니다: {error_msg}'
            }

    def get_mail_setting_history_count(self, mail_tp):
        """
        메일 설정 이력 개수 조회
        
        :param mail_tp: 메일 유형 (mail30, mail7, mail0)
        :return: 이력 개수
        """
        try:
            return self.dao.count_mail_setting_history(mail_tp)
        except Exception as e:
            self.logger.error(f"Failed to count mail setting history for {mail_tp}: {e}")
            return 0
