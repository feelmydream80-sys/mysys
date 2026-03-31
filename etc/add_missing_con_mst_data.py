"""
TB_CON_MST에 누락된 CD 데이터 추가 스크립트
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app
from datetime import datetime

def add_missing_con_mst_data():
    app = create_app()
    with app.app_context():
        print("=== TB_CON_MST에 누락된 CD 데이터 추가 ===")
        print()
        
        from msys.database import get_db_connection
        conn = None
        try:
            conn = get_db_connection()
            
            # TB_MNGR_SETT에 있지만 TB_CON_MST에 없는 CD 찾기
            missing_cds = []
            
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT m.CD 
                    FROM TB_MNGR_SETT m 
                    LEFT JOIN TB_CON_MST c ON m.CD = c.CD 
                    WHERE c.CD IS NULL
                """)
                missing_cds = [row[0] for row in cur.fetchall()]
            
            print(f"TB_CON_MST에 누락된 CD 개수: {len(missing_cds)}")
            if missing_cds:
                for cd in missing_cds:
                    print(f"   CD: {cd}")
                
                # 데이터 추가
                added_count = 0
                for cd in missing_cds:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO TB_CON_MST (CD_CL, CD, CD_NM, ITEM10, UPDATE_DT, USE_YN)
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (
                            'CD400',  # 기본 CD_CL
                            cd,
                            f"{cd} 명칭",
                            f"{cd}_API_KEY",
                            datetime.now(),
                            'Y'
                        ))
                    added_count += 1
                
                conn.commit()
                print(f"\n성공적으로 {added_count}개의 CD를 추가했습니다.")
                
                # 추가된 데이터 확인
                print("\n추가된 데이터 확인:")
                for cd in missing_cds:
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT CD, CD_CL, CD_NM, ITEM10, UPDATE_DT, USE_YN
                            FROM TB_CON_MST WHERE CD = %s
                        """, (cd,))
                        data = cur.fetchone()
                        
                    if data:
                        print(f"   CD: {data[0]}")
                        print(f"      CD_CL: {data[1]}")
                        print(f"      CD_NM: {data[2]}")
                        print(f"      ITEM10: {data[3]}")
                        print(f"      UPDATE_DT: {data[4]}")
                        print(f"      USE_YN: {data[5]}")
                        print()
                        
            else:
                print("TB_CON_MST에 모든 CD가 존재합니다.")
                
        except Exception as e:
            print(f"\n오류: {e}")
            import traceback
            print(traceback.format_exc())
            if conn:
                conn.rollback()
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass

if __name__ == "__main__":
    add_missing_con_mst_data()