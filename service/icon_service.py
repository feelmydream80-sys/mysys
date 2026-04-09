import io
import csv
import logging
from mapper.icon_mapper import IconMapper

class IconService:
    def __init__(self, db_connection):
        self.conn = db_connection
        self.icon_mapper = IconMapper(db_connection)

    def get_icon_mappings(self) -> tuple[dict, dict]:
        try:
            all_icons = self.icon_mapper.get_all_icons()
            emoji_to_int = {}
            int_to_emoji = {}
            for icon in all_icons:
                icon_code = icon.get('ICON_CD')
                icon_id = icon.get('ICON_ID')
                if icon_code and icon_id is not None:
                    emoji_to_int[icon_code] = icon_id
                    int_to_emoji[icon_id] = icon_code
            
            logging.debug(f"IconService.get_icon_mappings - Generated EMOJI_TO_INT: {emoji_to_int}")
            logging.debug(f"IconService.get_icon_mappings - Generated INT_TO_EMOJI: {int_to_emoji}")
            return emoji_to_int, int_to_emoji
        except Exception as e:
            logging.error(f"❌ 아이콘 매핑 로드 실패: {e}", exc_info=True)
            raise

    def get_all_icons_data(self) -> list[dict]:
        try:
            return self.icon_mapper.get_all_icons()
        except Exception as e:
            logging.error(f"❌ 아이콘 데이터 로드 실패 (관리 탭): {e}", exc_info=True)
            return []

    def insert_or_update_icon(self, icon_data: dict):
        try:
            # ICON_DSP_YN 값을 'Y' 또는 'N'으로 정규화
            dsp_yn = icon_data.get('ICON_DSP_YN')
            normalized_dsp_yn = 'Y'
            if isinstance(dsp_yn, str):
                if dsp_yn.strip().lower() in ['false', 'n']:
                    normalized_dsp_yn = 'N'
            elif isinstance(dsp_yn, bool):
                if not dsp_yn:
                    normalized_dsp_yn = 'N'
            icon_data['ICON_DSP_YN'] = normalized_dsp_yn

            # ICON_ID가 있으면 업데이트
            if icon_data.get('ICON_ID'):
                self.icon_mapper.update_icon(icon_data)
                return

            # ICON_ID가 없으면 ICON_CD로 기존 아이콘 확인
            icon_code = icon_data.get('ICON_CD')
            existing_icon = self.icon_mapper.get_icon_by_code(icon_code)

            if existing_icon:
                # 기존 아이콘이 있으면 업데이트
                icon_data['ICON_ID'] = existing_icon['icon_id']
                self.icon_mapper.update_icon(icon_data)
            else:
                # 기존 아이콘이 없으면 삽입
                self.icon_mapper.insert_icon(icon_data)
        except Exception as e:
            logging.error(f"❌ 아이콘 삽입/업데이트 실패 (데이터: {icon_data}): {e}", exc_info=True)
            raise

    def delete_icon(self, icon_id: int):
        try:
            self.icon_mapper.delete_icon(icon_id)
        except Exception as e:
            logging.error(f"❌ 아이콘 삭제 서비스 실패 (ID: {icon_id}): {e}", exc_info=True)
            raise

    def toggle_icon_display(self, icon_id: int, display_yn: str):
        try:
            status_str = display_yn if isinstance(display_yn, str) else ('Y' if display_yn else 'N')
            self.icon_mapper.toggle_icon_display(icon_id, status_str)
        except Exception as e:
            logging.error(f"❌ 아이콘 ID {icon_id} 표시 여부 상태 토글 실패: {e}", exc_info=True)
            raise

    def get_icon_code_by_id(self, icon_id: int) -> str:
        try:
            all_icons = self.get_all_icons_data()
            for icon in all_icons:
                if icon.get('icon_id') == icon_id:
                    return icon.get('icon_cd')
            return None
        except Exception as e:
            logging.error(f"❌ 아이콘 ID {icon_id}로 icon_cd 조회 실패: {e}", exc_info=True)
            return None

    def import_icons_from_csv(self, file_stream):
        """
        CSV 파일 스트림에서 아이콘 데이터를 읽어 데이터베이스에 추가/업데이트합니다.
        """
        try:
            # 전체 파일 내용을 읽고 utf-8-sig로 디코딩하여 BOM(Byte Order Mark)을 처리합니다.
            content = file_stream.read().decode('utf-8-sig')
            csv_file = io.StringIO(content)
            reader = csv.DictReader(csv_file)
            
            # CSV 헤더의 키를 데이터베이스 컬럼명과 일치시키기 위해 대문자로 변환합니다.
            # 이렇게 하면 'icon_cd'와 같은 소문자 헤더도 정상적으로 처리할 수 있습니다.
            if reader.fieldnames:
                reader.fieldnames = [field.upper().strip() for field in reader.fieldnames]
            
            icons_to_process = []
            logging.info("--- 아이콘 CSV 파일 데이터 로드 시작 ---")
            for row in reader:
                logging.info(f"CSV에서 읽은 데이터: {row}")
                # ICON_CD 값이 없거나 비어있는 행(파일 끝의 빈 줄 등)은 건너뜁니다.
                if row.get('ICON_CD') and row['ICON_CD'].strip():
                    # CSV 파일의 헤더가 데이터베이스 컬럼명과 일치해야 합니다.
                    # 예: ICON_CD, ICON_NM, ICON_DESC, ICON_DSP_YN
                    icons_to_process.append(row)
                else:
                    logging.warning(f"ICON_CD가 없거나 비어있어 해당 행을 건너뜁니다: {row}")
            logging.info("--- 아이콘 CSV 파일 데이터 로드 완료 ---")

            if not icons_to_process:
                raise ValueError("CSV 파일에 처리할 데이터가 없습니다.")

            # 1. 기존의 모든 아이콘 데이터를 삭제합니다.
            logging.info("--- 기존 아이콘 데이터 삭제 시작 ---")
            self.icon_mapper.delete_all_icons()
            logging.info("--- 기존 아이콘 데이터 삭제 완료 ---")

            # 2. CSV 파일의 새로운 데이터로 삽입합니다.
            logging.info("--- 새로운 아이콘 데이터 삽입 시작 ---")
            for icon_data in icons_to_process:
                # ICON_ID가 빈 문자열인 경우, 키 자체를 삭제하여 insert 로직을 타도록 유도
                if 'ICON_ID' in icon_data and not icon_data['ICON_ID']:
                    del icon_data['ICON_ID']
                self.icon_mapper.insert_icon(icon_data)
            logging.info("--- 새로운 아이콘 데이터 삽입 완료 ---")
            
            return len(icons_to_process)
            
        except Exception as e:
            logging.error(f"❌ 아이콘 CSV 가져오기 서비스 실패: {e}", exc_info=True)
            # 예외를 다시 발생시켜 라우트에서 트랜잭션 롤백을 처리하도록 합니다.
            raise
