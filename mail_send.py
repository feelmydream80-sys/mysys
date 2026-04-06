"""
Email sending functionality extracted from Airflow's ServiceMonitor (mail_s.txt)
Adapted for Flask web application
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
import logging
from config import config

# Configure logging
logger = logging.getLogger(__name__)

def send_email(to, subject, html_content):
    """
    Send email using SMTP server
    :param to: Recipient email address
    :param subject: Email subject
    :param html_content: HTML email body
    """
    try:
        # [Step 1] 메시지 생성
        logger.info("[Step 1] 메시지 생성 시작")
        msg = MIMEMultipart('alternative')
        # MAIL_SENDER가 비어있으면 수신자 주소를 발신자로 사용
        sender = config.MAIL_SENDER if config.MAIL_SENDER else to
        msg['From'] = sender
        msg['To'] = to
        msg['Subject'] = subject
        
        # Attach HTML content
        part_html = MIMEText(html_content, 'html')
        msg.attach(part_html)
        logger.info("[Step 1] 메시지 생성 완료")
        
        # [Step 2] SMTP 서버 연결
        logger.info(f"[Step 2] SMTP 서버 연결: {config.MAIL_SERVER}:{config.MAIL_PORT}")
        with smtplib.SMTP(config.MAIL_SERVER, config.MAIL_PORT) as server:
            # [Step 3] TLS
            if config.MAIL_USE_TLS:
                logger.info("[Step 3] TLS 시작")
                server.starttls()
                logger.info("[Step 3] TLS 시작 완료")
            else:
                logger.info("[Step 3] TLS 사용하지 않음 (SKIP)")
            
            # [Step 4] 인증
            if config.MAIL_USERNAME and config.MAIL_PASSWORD:
                logger.info("[Step 4] SMTP 인증 시도")
                server.login(config.MAIL_USERNAME, config.MAIL_PASSWORD)
                logger.info("[Step 4] SMTP 인증 성공")
            else:
                logger.info("[Step 4] 인증 정보 없음 (SKIP)")
            
            # [Step 5] 메일 전송
            logger.info(f"[Step 5] 메일 전송: {sender} -> {to}")
            server.sendmail(sender, to, msg.as_string())
            logger.info("[Step 5] 메일 전송 성공")
        
        logger.info(f"Email sent successfully to: {to}")
        return True
    except smtplib.SMTPConnectError as e:
        logger.error(f"[오류] SMTP 연결 실패: 서버에 연결할 수 없습니다. ({e})")
        return False
    except smtplib.SMTPHeloError as e:
        logger.error(f"[오류] SMTP HELO 실패: 서버가 HELO 명령을 거부했습니다. ({e})")
        return False
    except smtplib.SMTPSenderRefused as e:
        logger.error(f"[오류] 발신자 거부됨: 서버가 발신자 주소를 거부했습니다. ({e})")
        return False
    except smtplib.SMTPRecipientsRefused as e:
        logger.error(f"[오류] 수신자 거부됨: 서버가 수신자 주소를 거부했습니다. ({e})")
        return False
    except smtplib.SMTPDataError as e:
        logger.error(f"[오류] SMTP 데이터 오류: 메일 데이터 전송 중 오류 발생 ({e})")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"[오류] SMTP 일반 오류: {e}")
        return False
    except ConnectionRefusedError as e:
        logger.error(f"[오류] 연결 거부됨: 서버에서 연결을 거부했습니다. ({e})")
        return False
    except TimeoutError as e:
        logger.error(f"[오류] 연결 타임아웃: 서버에 연결하지 못했습니다. ({e})")
        return False
    except Exception as e:
        logger.error(f"[오류] 예상치 못한 오류: {type(e).__name__}: {e}")
        return False

def create_api_key_expiry_email(api_key_data, subject_template=None, body_template=None):
    """
    Create email content for API key expiry notification
    Following the structure from Airflow's ServiceMonitor
    
    템플릿 변수 지원:
    - {{cd}}: 코드 값
    - {{cd_nm}}: 코드 명칭
    - {{expiry_dt}}: 만료일
    - {{days_remaining}}: 남은 기간 (일)
    - {{start_dt}}: 등록일
    - {{due}}: 기간 (년)
    - {{api_ownr_email_addr}}: API 책임자 이메일
    
    :param api_key_data: API key information dictionary
    :param subject_template: Optional subject template (uses default if None)
    :param body_template: Optional body template (uses default if None)
    :return: Email subject and HTML body
    """
    # 코드 명칭 가져오기
    cd_nm = api_key_data.get('cd_nm', api_key_data.get('cd', ''))
    
    # 템플릿 치환을 위한 컨텍스트
    context = {
        'cd': api_key_data.get('cd', ''),
        'cd_nm': cd_nm,
        'expiry_dt': api_key_data.get('expiry_dt', ''),
        'days_remaining': str(api_key_data.get('days_remaining', '')),
        'start_dt': api_key_data.get('start_dt', ''),
        'due': str(api_key_data.get('due', '')),
        'api_ownr_email_addr': api_key_data.get('api_ownr_email_addr', ''),
    }
    
    # 기본 제목 템플릿
    if subject_template is None:
        subject_template = "[빅데이터 플랫폼] API 키 만료 알림: {{cd}} - {{expiry_dt}}"
    
    # 기본 본문 템플릿
    if body_template is None:
        body_template = """API 키 '{{cd_nm}}({{cd}})'가 곧 만료됩니다.<br/> <br/>
API 키 코드: {{cd}}<br/> <br/>
코드 명칭: {{cd_nm}}<br/> <br/>
만료일: {{expiry_dt}}<br/> <br/>
남은 기간: {{days_remaining}}일<br/> <br/>
등록일: {{start_dt}}<br/> <br/>
기간: {{due}}년<br/> <br/>

빠른 조치가 필요합니다. API 키를 갱신해 주세요.<br/> <br/>

감사합니다.<br/>
빅데이터 플랫폼 관리팀"""
    
    # 템플릿 변수 치환
    subject = subject_template
    body = body_template
    for key, value in context.items():
        placeholder = '{{' + key + '}}'
        subject = subject.replace(placeholder, str(value))
        body = body.replace(placeholder, str(value))
    
    return subject, body

def validate_email_address(email):
    """
    Validate email address format
    :param email: Email address to validate
    :return: True if valid, False otherwise
    """
    if not email:
        return False
    
    email = email.strip()
    if '@' not in email or '.' not in email.split('@')[-1]:
        return False
    
    return True