# mapper/admin_settings_mapper.py
"""
데이터 변환을 책임지는 매퍼 계층입니다.
Service와 DAO 사이에서 데이터 객체를 변환하여 각 계층의 역할을 명확히 분리합니다.
"""
import logging
from dao.mngr_sett_dao import MngrSettDAO
from msys.column_mapper import convert_to_legacy_columns, convert_to_new_columns

class MngrSettMapper:
    """
    AdminSettingsDAO를 사용하여 데이터베이스와 상호작용하고,
    Service 계층이 사용하기 좋은 형태로 데이터를 변환합니다.
    """
    def __init__(self, db_connection):
        self.conn = db_connection
        self.dao = MngrSettDAO(self.conn)
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_settings_by_cd(self, cd: str):
        """
        특정 cd에 해당하는 설정을 조회하고, 레거시 컬럼명으로 변환하여 반환합니다.
        """
        settings = self.dao.get_settings_by_cd(cd)
        if settings:
            # DAO는 순수 데이터를 반환하고, 매퍼에서 컬럼명 변환을 책임집니다.
            return convert_to_legacy_columns('TB_MNGR_SETT', settings)
        return None

    def insert_or_update_settings(self, settings_data: dict):
        """
        데이터를 새로운 컬럼명 기준으로 변환한 후,
        기존 설정 유무에 따라 삽입 또는 업데이트를 수행합니다.
        """
        # 1. 데이터를 표준 컬럼명으로 변환
        from msys.column_mapper import column_mapper
        reverse_mapping = column_mapper.get_reverse_mapping('TB_MNGR_SETT')
        self.logger.info(f"Mapper: Table name: TB_MNGR_SETT")
        self.logger.info(f"Mapper: Reverse mapping for TB_MNGR_SETT: {reverse_mapping}")
        self.logger.info(f"Mapper: Original settings_data keys: {list(settings_data.keys())}")
        self.logger.info(f"Mapper: Original settings_data['sett_id']: {settings_data.get('sett_id')}")
        converted_settings = convert_to_new_columns('TB_MNGR_SETT', settings_data)
        # 표준화: 모든 키를 소문자로 변환하여 DB 컬럼명과 일치시키기
        converted_settings = {k.lower(): v for k, v in converted_settings.items()}
        self.logger.info(f"Mapper: Converted settings keys: {list(converted_settings.keys())}")
        self.logger.info(f"Mapper: Converted settings['cd']: {converted_settings.get('cd')}")
        self.logger.info(f"Mapper: Converted settings['sett_id']: {converted_settings.get('sett_id')}")
        cd = converted_settings.get('cd') or converted_settings.get('CD')

        # 2. 기존 설정 확인 (변환된 데이터 기준)
        existing_settings = self.dao.get_settings_by_cd(cd)

        # 3. 조건에 따라 삽입 또는 업데이트
        if existing_settings:
            self.logger.info(f"Mapper: 기존 설정 업데이트 (CD: {cd})")
            # 서비스 로직에서 가져온 병합 로직
            final_settings = {**existing_settings, **converted_settings}
            self.dao.update_settings(final_settings)
            self.logger.info(f"Mapper: 설정 업데이트 완료 (CD: {cd})")
        else:
            self.logger.info(f"Mapper: 신규 설정 삽입 (CD: {cd})")
            # 서비스 로직에서 가져온 기본값 병합 로직은 서비스에 유지
            # 매퍼는 순수 데이터 CRUD에 집중
            self.dao.insert_settings(converted_settings)
            self.logger.info(f"Mapper: 신규 설정 삽입 완료 (CD: {cd})")

    def get_all_settings(self) -> list[dict]:
        """
        모든 설정 데이터를 조회하여 반환합니다.
        DAO에서 받은 순수 데이터를 그대로 반환하거나, 필요시 가공합니다.
        여기서는 DAO의 반환값을 그대로 전달합니다.
        """
        return self.dao.get_all_settings()

    def delete_settings(self, cd: str):
        """
        특정 cd에 해당하는 설정을 삭제합니다.
        """
        self.logger.info(f"Mapper: 설정 삭제 요청 (CD: {cd})")
        self.dao.delete_settings(cd)
        self.logger.info(f"Mapper: 설정 삭제 완료 (CD: {cd})")

    def get_all_menu_settings(self) -> list[dict]:
        """
        모든 메뉴 설정 데이터를 조회하여 반환합니다.
        """
        menu_settings = self.dao.get_all_menu_settings()
        return menu_settings
