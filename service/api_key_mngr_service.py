"""TB_API_KEY_MNGR 서비스 레이어"""

from dao.api_key_mngr_dao import ApiKeyMngrDao
from dao.con_mst_dao import ConMstDAO
from datetime import datetime
from msys.database import get_db_connection
import logging
from mail_send import send_email, create_api_key_expiry_email, validate_email_address

class ApiKeyMngrService:
    """TB_API_KEY_MNGR 서비스 클래스"""

    def __init__(self):
        """Initialize ApiKeyMngrService"""
        self.dao = ApiKeyMngrDao()
        self.logger = logging.getLogger(__name__)

    def get_all_api_key_mngr(self):
        """Get all API key manager records with expiry information"""
        try:
            data = self.dao.select_all()
            
            # Convert dates and calculate expiry info
            result = []
            today = datetime.now().date()
            
            for item in data:
                if isinstance(item['start_dt'], str):
                    item['start_dt'] = datetime.strptime(item['start_dt'], '%Y-%m-%d').date()
                
                expiry_dt = datetime(item['start_dt'].year + item['due'], item['start_dt'].month, item['start_dt'].day).date() if item['start_dt'] else None
                days_remaining = (expiry_dt - today).days if expiry_dt else 0
                
                item['start_dt'] = item['start_dt'].isoformat() if item['start_dt'] else None
                item['expiry_dt'] = expiry_dt.isoformat() if expiry_dt else None
                item['days_remaining'] = days_remaining
                item['is_expiring_soon'] = days_remaining <= 30
                
                result.append(item)
            
            # Sort by start date (descending)
            result.sort(key=lambda x: x['start_dt'], reverse=True)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error getting API key manager data: {e}")
            raise

    def update_cd_from_mngr_sett(self):
        """Update CD values in TB_API_KEY_MNGR from TB_MNGR_SETT"""
        try:
            added_cds = []
            updated_cds = []
            
            # Get all CD values from TB_MNGR_SETT not in TB_API_KEY_MNGR
            conn = get_db_connection()
            cds_not_in_api_key_mngr = self.dao.select_cds_not_in_api_key_mngr(conn)
            
            # Add each CD to TB_API_KEY_MNGR with data from TB_CON_MST
            for cd_item in cds_not_in_api_key_mngr:
                cd = cd_item['cd']
                
                try:
                    # Get ITEM10 and UDATE_DT from TB_CON_MST
                    con_mst_dao = ConMstDAO(conn)
                    con_mst_data = con_mst_dao.get_mst_data_by_cd(cd)
                    
                    if con_mst_data:
                        self.dao.insert(
                            cd=cd,
                            due=1,  # Default due is 1 year
                            start_dt=con_mst_data['udate_dt'],
                            api_ownr_email_addr='',  # Empty string instead of None
                            conn=conn
                        )
                        added_cds.append(cd)
                    else:
                        self.logger.warning(f"No CON_MST data found for CD: {cd}")
                
                except Exception as e:
                    self.logger.error(f"Error processing CD {cd}: {e}")
            
            return {'added_cds': added_cds, 'updated_cds': updated_cds}
            
        except Exception as e:
            self.logger.error(f"Error updating CD values: {e}")
            raise
    
    def update_api_key_mngr_with_api_key(self, cd, due, start_dt, api_ownr_email_addr, api_key):
        """Update API key manager data including API key in TB_CON_MST"""
        try:
            conn = get_db_connection()
            
            # Update TB_API_KEY_MNGR
            self.dao.update(cd, due, start_dt, api_ownr_email_addr, conn)
            
            # Update TB_CON_MST ITEM10 with API key
            con_mst_dao = ConMstDAO(conn)
            con_mst_data = con_mst_dao.get_mst_data_by_cd(cd)
            
            if con_mst_data:
                # Update only ITEM10
                update_data = {
                    'item10': api_key
                }
                # Since cd_cl is required for update, we need to find it
                # First, let's get all columns from con_mst_data to preserve existing values
                full_update_data = {**con_mst_data, **update_data}
                con_mst_dao.update_mst_data(con_mst_data['cd_cl'], cd, full_update_data)
            
            conn.commit()
            self.logger.debug(f"Successfully updated API key manager and API key for CD: {cd}")
            return True
            
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            self.logger.error(f"Error updating API key manager with API key: {e}")
            raise

    def get_mail_settings(self):
        """Get all mail settings"""
        try:
            return self.dao.select_mail_settings()
        except Exception as e:
            self.logger.error(f"Error getting mail settings: {e}")
            raise

    def save_mail_settings(self, settings):
        """Save mail settings"""
        try:
            for mail_tp in ['mail30', 'mail7', 'mail0']:
                if mail_tp in settings:
                    s = settings[mail_tp]
                    self.dao.upsert_mail_settings(
                        mail_tp=mail_tp,
                        subject=s.get('subject', ''),
                        from_email=s.get('from', ''),
                        body=s.get('body', '')
                    )
            return True
        except Exception as e:
            self.logger.error(f"Error saving mail settings: {e}")
            raise

    def get_event_logs(self, limit=100):
        """Get event logs"""
        try:
            return self.dao.select_event_logs(limit)
        except Exception as e:
            self.logger.error(f"Error getting event logs: {e}")
            raise

    def send_expiry_notification(self, cds):
        """
        Send API key expiry notification emails for selected CDs
        Following the same pattern as Airflow's ServiceMonitor.write_email() and send_emails()
        
        :param cds: List of CD strings to send notifications for
        :return: dict with success/failure results
        """
        results = {
            'success': [],
            'failed': [],
            'skipped': []
        }
        
        try:
            # Get all API key data
            all_data = self.get_all_api_key_mngr()
            
            # Filter data for requested CDs
            target_data = [item for item in all_data if item['cd'] in cds]
            
            # 메일 설정 가져오기 (템플릿용)
            mail_settings = {}
            try:
                settings_list = self.get_mail_settings()
                for s in settings_list:
                    mail_settings[s['mail_tp']] = {
                        'subject': s.get('subject', ''),
                        'body': s.get('body', '')
                    }
            except Exception as e:
                self.logger.warning(f"Failed to load mail settings: {e}")
            
            for api_key_data in target_data:
                # Validate email address
                email_addr = api_key_data.get('api_ownr_email_addr', '')
                if not validate_email_address(email_addr):
                    self.logger.warning(f"Invalid email address for CD {api_key_data['cd']}: {email_addr}")
                    results['skipped'].append({
                        'cd': api_key_data['cd'],
                        'reason': f'Invalid email: {email_addr}'
                    })
                    # Log the skipped event
                    try:
                        self.dao.insert_event_log(
                            cd=api_key_data['cd'],
                            to_email=email_addr,
                            success=False,
                            error_msg=f'Invalid email: {email_addr}'
                        )
                    except:
                        pass
                    continue
                
                # 남은 기간에 따른 메일 설정 선택
                days_remaining = api_key_data.get('days_remaining', 999)
                if days_remaining <= 0:
                    mail_tp = 'mail0'
                elif days_remaining <= 7:
                    mail_tp = 'mail7'
                elif days_remaining <= 30:
                    mail_tp = 'mail30'
                else:
                    mail_tp = 'mail30'  # 기본값
                
                # 메일 설정에서 템플릿 가져오기
                mail_setting = mail_settings.get(mail_tp, {})
                subject_template = mail_setting.get('subject', None) or None
                body_template = mail_setting.get('body', None) or None
                
                # Create email content with template variables
                subject, body = create_api_key_expiry_email(
                    api_key_data,
                    subject_template=subject_template,
                    body_template=body_template
                )
                
                # Send email (following mail_s.txt EmailOperator pattern)
                try:
                    success = send_email(
                        to=email_addr,
                        subject=subject,
                        html_content=body
                    )
                    
                    if success:
                        self.logger.info(f"Email sent successfully for CD: {api_key_data['cd']} to {email_addr}")
                        results['success'].append({
                            'cd': api_key_data['cd'],
                            'email': email_addr
                        })
                        # Log the success event
                        try:
                            self.dao.insert_event_log(
                                cd=api_key_data['cd'],
                                to_email=email_addr,
                                success=True
                            )
                        except:
                            pass
                    else:
                        results['failed'].append({
                            'cd': api_key_data['cd'],
                            'reason': 'send_email returned False'
                        })
                        # Log the failed event
                        try:
                            self.dao.insert_event_log(
                                cd=api_key_data['cd'],
                                to_email=email_addr,
                                success=False,
                                error_msg='send_email returned False'
                            )
                        except:
                            pass
                        
                except Exception as e:
                    self.logger.error(f"Failed to send email for CD {api_key_data['cd']}: {str(e)}")
                    results['failed'].append({
                        'cd': api_key_data['cd'],
                        'reason': str(e)
                    })
                    # Log the failed event
                    try:
                        self.dao.insert_event_log(
                            cd=api_key_data['cd'],
                            to_email=email_addr,
                            success=False,
                            error_msg=str(e)
                        )
                    except:
                        pass
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error in send_expiry_notification: {str(e)}")
            raise
