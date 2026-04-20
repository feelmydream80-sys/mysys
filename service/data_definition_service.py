# service/data_definition_service.py
import logging
from dao.con_mst_dao import ConMstDAO
from dao.mngr_sett_dao import MngrSettDAO
import random
from utils.job_utils import should_exclude_job

# Default settings for mngr_sett
DEFAULT_MNGR_SETT = {
    'cnn_failr_thrs_val': 5,
    'cnn_warn_thrs_val': 3,
    'cnn_failr_icon_id': 2,
    'cnn_failr_wrd_colr': '#dc3545',
    'cnn_warn_icon_id': 5,
    'cnn_warn_wrd_colr': '#ffc107',
    'cnn_sucs_icon_id': 1,
    'cnn_sucs_wrd_colr': '#28a745',
    'dly_sucs_rt_thrs_val': 95.0,
    'dd7_sucs_rt_thrs_val': 90.0,
    'mthl_sucs_rt_thrs_val': 85.0,
    'mc6_sucs_rt_thrs_val': 80.0,
    'yy1_sucs_rt_thrs_val': 75.0,
    'sucs_rt_sucs_icon_id': 1,
    'sucs_rt_sucs_wrd_colr': '#28a745',
    'sucs_rt_warn_icon_id': 5,
    'sucs_rt_warn_wrd_colr': '#ffc107',
    'chrt_colr': '#007bff',
    'chrt_dsp_yn': 'Y',
    'grass_chrt_min_colr': '#9be9a8',
    'grass_chrt_max_colr': '#216e39'
}

def get_random_hex_color() -> str:
    """Generates a random hex color."""
    return f"#{random.randint(0, 0xFFFFFF):06x}"

class DataDefinitionService:
    def __init__(self, db_connection):
        self.conn = db_connection
        self.con_mst_dao = ConMstDAO(db_connection)
        self.mngr_sett_dao = MngrSettDAO(db_connection)
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_data_list(self):
        """데이터 목록을 조회합니다."""
        try:
            data = self.con_mst_dao.get_all_mst()
            return data
        except Exception as e:
            self.logger.error(f"Error in get_data_list: {e}", exc_info=True)
            raise

    def create_data(self, data):
        """새로운 데이터를 생성합니다."""
        try:
            # 데이터 유효성 검사
            cd_cl = data.get('cd_cl')
            cd = data.get('cd')
            
            if not cd_cl or not cd:
                raise ValueError("CD_CL and CD are required.")
            
            # CD는 'CD'로 시작해야 함
            if not cd.startswith('CD'):
                raise ValueError("CD must start with 'CD'.")
            
            # 중복 검사
            existing_data = self.con_mst_dao.get_mst_data_by_cd(cd)
            if existing_data:
                raise ValueError(f"Data with CD {cd} already exists.")
            
            # 데이터 삽입
            self.con_mst_dao.insert_mst_data(data)
            self.logger.info(f"Data created successfully: {cd}")
            
            # tb_mngr_sett 테이블에 자동으로 데이터 삽입 (100의 배수는 제외)
            if not should_exclude_job(cd):
                self.create_mngr_sett(cd)
                self.logger.info(f"Auto created mngr sett for CD: {cd}")

            # 그룹 활성화 로직 (cd_cl이 그룹 코드인 경우)
            cd_cl_number = int(cd_cl[2:]) if cd_cl.startswith('CD') and cd_cl[2:].isdigit() else None
            if cd_cl_number and cd_cl_number % 100 == 0:
                # 그룹이 비활성화 상태인 경우 활성화
                group_data = self.con_mst_dao.get_mst_data_by_cd(cd_cl)
                if group_data and (not group_data.get('use_yn') or group_data.get('use_yn').strip() == 'N'):
                    self.con_mst_dao.update_mst_data(cd_cl, cd_cl, {'use_yn': 'Y'})
                    self.logger.info(f"Group activated automatically: {cd_cl}")
            
        except Exception as e:
            self.logger.error(f"Error in create_data: {e}", exc_info=True)
            raise

    def create_mngr_sett(self, cd):
        """관리자 설정 데이터를 생성합니다."""
        try:
            # 기존 설정 확인
            existing_settings = self.mngr_sett_dao.get_settings_by_cd(cd)
            if existing_settings:
                self.logger.info(f"Mngr sett already exists for CD: {cd}")
                return
            
            # 기본 설정에 랜덤 색상 추가
            new_setting_data = DEFAULT_MNGR_SETT.copy()
            new_setting_data['cd'] = cd
            new_setting_data['chrt_colr'] = get_random_hex_color()
            
            # 설정 삽입
            self.mngr_sett_dao.insert_settings(new_setting_data)
            self.logger.info(f"Mngr sett created successfully for CD: {cd}")
        except Exception as e:
            self.logger.error(f"Error in create_mngr_sett: {e}", exc_info=True)
            raise

    def update_data(self, cd_cl, cd, data):
        """기존 데이터를 수정합니다."""
        try:
            # 로그 추가 - 수정 시작
            self.logger.info(f"Update data started: cd_cl={cd_cl}, cd={cd}, data={data}")
            
            # 데이터 존재 여부 확인
            existing_data = self.con_mst_dao.get_mst_data_by_cd(cd)
            if not existing_data:
                raise ValueError(f"Data with CD {cd} does not exist.")
            
            # use_yn 값이 전달되지 않거나 공백인 경우 기본값 'Y'로 설정
            if 'use_yn' in data and data['use_yn']:
                data['use_yn'] = data['use_yn'].strip()
            else:
                data['use_yn'] = 'Y'

            # cd가 그룹 코드인지 확인 (100의 배수)
            cd_number = int(cd[2:]) if cd.startswith('CD') and cd[2:].isdigit() else None
            if cd_number and should_exclude_job(cd):
                # 그룹 자체를 활성화(Y)할 때, 그룹의 하위 데이터도 활성화(Y)로 변경
                if data['use_yn'] == 'Y':
                    self.logger.info(f"Group activation started: cd={cd}, cd_number={cd_number}")
                    group_number = cd_number
                    start_number = group_number + 1
                    end_number = group_number + 100
                    
                    all_data = self.con_mst_dao.get_all_mst_full()
                    group_details = []
                    for row in all_data:
                        cd_value = row.get('cd', '')
                        if cd_value.startswith('CD'):
                            try:
                                cd_num = int(cd_value[2:])
                                if start_number <= cd_num < end_number:
                                    group_details.append(row)
                            except ValueError:
                                continue
                    
                    self.logger.info(f"Group details to activate: {len(group_details)} items")
                    for detail in group_details:
                        self.con_mst_dao.update_mst_data(cd, detail['cd'], {'use_yn': 'Y'})
                        self.logger.info(f"Detail activated successfully: {detail['cd']}")
            else:
                # 상세 객체를 활성화(Y)할 때 그룹도 활성화(Y)로 변경
                if data['use_yn'] == 'Y':
                    cd_cl_number = int(cd_cl[2:]) if cd_cl.startswith('CD') and cd_cl[2:].isdigit() else None
                    if cd_cl_number and should_exclude_job(cd_cl):
                        group_data = self.con_mst_dao.get_mst_data_by_cd(cd_cl)
                        if group_data and (not group_data.get('use_yn') or group_data.get('use_yn').strip() == 'N'):
                            self.con_mst_dao.update_mst_data(cd_cl, cd_cl, {'use_yn': 'Y'})
                            self.logger.info(f"Group activated successfully: {cd_cl}")
            
            # 데이터 업데이트
            self.con_mst_dao.update_mst_data(cd_cl, cd, data)
            self.logger.info(f"Data updated successfully: {cd}")
        except Exception as e:
            self.logger.error(f"Error in update_data: {e}", exc_info=True)
            raise

    def delete_data(self, cd_cl, cd):
        """데이터를 삭제합니다. (소프트 삭제)"""
        try:
            # 데이터 존재 여부 확인
            existing_data = self.con_mst_dao.get_mst_data_by_cd(cd)
            if not existing_data:
                raise ValueError(f"Data with CD {cd} does not exist.")
            
            # cd가 그룹 코드인지 확인 (100의 배수)
            cd_number = int(cd[2:]) if cd.startswith('CD') and cd[2:].isdigit() else None
            if cd_number and should_exclude_job(cd):
                # 그룹 삭제 - 해당 그룹의 모든 하위 데이터를 비활성화
                group_number = cd_number
                start_number = group_number + 1
                end_number = group_number + 100
                
                # 전체 데이터를 가져와서 하위 데이터 필터링
                all_data = self.con_mst_dao.get_all_mst_full()
                group_details = []
                for row in all_data:
                    cd_value = row.get('cd', '')
                    if cd_value.startswith('CD'):
                        try:
                            cd_num = int(cd_value[2:])
                            if start_number <= cd_num < end_number:
                                group_details.append(row)
                        except ValueError:
                            continue
                
                # 하위 데이터 비활성화
                for detail in group_details:
                    self.con_mst_dao.delete_mst_data(detail['cd_cl'], detail['cd'])
                
                # 그룹 헤더 자체도 비활성화
                self.con_mst_dao.delete_mst_data(cd_cl, cd)
                
                self.logger.info(f"Group and all details deleted successfully: {cd} (Count: {len(group_details)})")
            else:
                # 개별 데이터 삭제
                self.con_mst_dao.delete_mst_data(cd_cl, cd)
                self.logger.info(f"Data deleted successfully: {cd}")
        except Exception as e:
            self.logger.error(f"Error in delete_data: {e}", exc_info=True)
            raise

    def get_data_groups(self):
        """전체 데이터 목록을 조회합니다."""
        try:
            # 전체 데이터를 받아옴
            all_data = self.con_mst_dao.get_all_mst_full()
            
            # 로그 추가
            self.logger.info(f"🔍 get_data_groups 전체 데이터 개수: {len(all_data)}")
            for i, row in enumerate(all_data[:5]):  # 상위 5개만 로그
                self.logger.info(f"🔍 get_data_groups 전체 데이터 {i+1}: {row}")
            
            # 전체 데이터를 그대로 반환
            return all_data
            
        except Exception as e:
            self.logger.error(f"Error in get_data_groups: {e}", exc_info=True)
            raise

    def get_group_details(self, cd):
        """특정 그룹의 상세 정보를 조회합니다."""
        try:
            # 1. 전체 데이터를 받아옴
            all_data = self.con_mst_dao.get_all_mst_full()
            
            # 로그 추가
            self.logger.info(f"🔍 get_group_details 전체 데이터 개수: {len(all_data)}")
            for i, row in enumerate(all_data[:5]):  # 상위 5개만 로그
                self.logger.info(f"🔍 get_group_details 전체 데이터 {i+1}: {row}")
            
            # 2. 그룹 번호 추출
            group_number = int(cd[2:])
            start_number = group_number + 1
            end_number = group_number + 100
            
            # 3. 파이썬에서 필터링
            details = []
            for row in all_data:
                cd_value = row.get('cd', '')
                if cd_value.startswith('CD'):
                    try:
                        cd_num = int(cd_value[2:])
                        if start_number <= cd_num < end_number:
                            details.append({
                                'cd_cl': row.get('cd_cl'),
                                'cd': row.get('cd'),
                                'cd_nm': row.get('cd_nm'),
                                'cd_desc': row.get('cd_desc'),
                                'item1': row.get('item1'),
                                'item2': row.get('item2'),
                                'item3': row.get('item3'),
                                'item4': row.get('item4'),
                                'item5': row.get('item5'),
                                'item6': row.get('item6'),
                                'item7': row.get('item7'),
                                'item8': row.get('item8'),
                                'item9': row.get('item9'),
                                'item10': row.get('item10'),
                                'use_yn': row.get('use_yn'),
                                'update_dt': row.get('update_dt'),
                                'del_dt': row.get('del_dt')
                            })
                    except ValueError:
                        continue
            
            # 4. 정렬
            details.sort(key=lambda x: x['cd'])
            
            # 로그 추가
            self.logger.info(f"🔍 get_group_details 필터링 후 데이터 개수: {len(details)}")
            for i, row in enumerate(details[:5]):  # 상위 5개만 로그
                self.logger.info(f"🔍 get_group_details 필터링 후 데이터 {i+1}: {row}")
            
            return details
            
        except Exception as e:
            self.logger.error(f"Error in get_group_details: {e}", exc_info=True)
            raise

    def _count_group_status(self, cd):
        """그룹 내 사용중/사용안함 상태 카운트 (더 이상 사용하지 않음)"""
        return 0, 0
