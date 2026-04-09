from __future__ import annotations
from typing import Optional, List, Dict
from msys.database import get_db_connection
import logging


class StsCdDAO:
    """
    상태코드 마스터 DAO
    ✅ 표준 명명 규칙 100% 준수
    ✅ CD900 계열 전용
    """
    
    @staticmethod
    def get_all() -> List[Dict]:
        """사용중인 모든 상태코드 목록 조회"""
        try:
            db = get_db_connection()
            cursor = db.cursor()
            cursor.execute("""
                SELECT 
                    s.CD, 
                    s.NM, 
                    s.DESCR, 
                    s.COLR,
                    s.ICON_CD,
                    s.ORD,
                    s.BG_COLR,
                    s.TXT_COLR,
                    i.ICON_NM
                FROM TB_STS_CD_MST s
                LEFT JOIN TB_ICON i ON s.ICON_CD = i.ICON_CD
                ORDER BY s.ORD, s.CD
            """)
            
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            result = [dict(zip(columns, row)) for row in rows]
            
            return result
        except Exception as e:
            logging.error(f"StsCdDAO.get_all() error: {e}", exc_info=True)
            return []
    
    @staticmethod
    def get_by_cd(cd: str) -> Optional[Dict]:
        """코드로 상태정보 조회"""
        try:
            db = get_db_connection()
            cursor = db.cursor()
            cursor.execute("""
                SELECT CD, NM, DESCR, COLR, ICON_CD
                FROM TB_STS_CD_MST 
                WHERE CD = %s
            """, (cd,))
            
            row = cursor.fetchone()
            if not row:
                return None
                
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))
        except Exception as e:
            logging.error(f"StsCdDAO.get_by_cd() error: {e}", exc_info=True)
            return None
    
    @staticmethod
    def is_valid_cd(cd: str) -> bool:
        """유효한 상태코드인지 확인"""
        try:
            db = get_db_connection()
            cursor = db.cursor()
            cursor.execute("""
                SELECT 1 FROM TB_STS_CD_MST 
                WHERE CD = %s
            """, (cd,))
            return cursor.fetchone() is not None
        except Exception as e:
            logging.error(f"StsCdDAO.is_valid_cd() error: {e}", exc_info=True)
            return False

    @staticmethod
    def upsert_status_code(data: dict) -> bool:
        """
        TB_STS_CD_MST에 상태코드를 upsert합니다.
        
        Args:
            data: 상태코드 데이터
                {
                    'cd': 'CD901',
                    'nm': '성공',
                    'descr': 'Total Finished',
                    'colr': '#28a745',
                    'icon_cd': '✅',
                    'ord': 901,
                    'use_yn': 'Y'
                }
        
        Returns:
            bool: 성공 여부
        """
        try:
            db = get_db_connection()
            cursor = db.cursor()
            
            # 필수 필드 검증
            cd = data.get('cd')
            if not cd:
                raise ValueError("상태코드(cd)는 필수입니다.")
            
            # CD 코드 기반 NM 기본값 매핑
            nm_default_map = {
                'CD901': '성공',
                'CD902': '실패',
                'CD903': '데이터 존재안함',
                'CD904': '진행중',
                'CD905': 'DMZ완료',
                'CD906': '재시도',
                'CD907': '예정',
                'CD908': '미수집'
            }
            
            # NM이 빈 문자열이면 CD 코드 기반 기본값 사용
            nm_value = data.get('nm', '') or nm_default_map.get(cd, '')
            
            # PostgreSQL 호환 upsert
            cursor.execute("""
                INSERT INTO TB_STS_CD_MST (
                    CD, NM, DESCR, COLR, ICON_CD, ORD, BG_COLR, TXT_COLR,
                    REG_DT, UPD_DT
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(CD) DO UPDATE SET
                    NM = EXCLUDED.NM,
                    DESCR = EXCLUDED.DESCR,
                    COLR = EXCLUDED.COLR,
                    ICON_CD = EXCLUDED.ICON_CD,
                    ORD = EXCLUDED.ORD,
                    BG_COLR = EXCLUDED.BG_COLR,
                    TXT_COLR = EXCLUDED.TXT_COLR,
                    UPD_DT = CURRENT_TIMESTAMP
            """, (
                cd,
                nm_value,
                data.get('descr', ''),
                data.get('colr', ''),
                data.get('icon_cd', ''),
                data.get('ord', 999),
                data.get('bg_colr', '#F3F4F6'),
                data.get('txt_colr', '#374151')
            ))
            
            db.commit()
            logging.info(f"StsCdDAO.upsert_status_code() 성공: CD={cd}")
            return True
            
        except Exception as e:
            logging.error(f"StsCdDAO.upsert_status_code() 실패: {e}", exc_info=True)
            if 'db' in locals():
                db.rollback()
            raise