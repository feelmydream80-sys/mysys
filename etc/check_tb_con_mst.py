"""
TB_CON_MST 테이블 구조 확인 스크립트
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from msys_app import create_app

app = create_app()

with app.app_context():
    print("=== TB_CON_MST 테이블 구조 확인 ===")
    print()
    
    from msys.database import get_db_connection
    conn = None
    try:
        conn = get_db_connection()
        
        # 1. 테이블 정보 조회
        print("1. 테이블 컬럼 정보")
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'tb_con_mst'
                ORDER BY ordinal_position
            """)
            
            for row in cur.fetchall():
                print(f"   {row[0]} ({row[1]}) - NULL: {row[3]}")
        
        print()
        
        # 2. 테이블 데이터 개수
        print("2. 테이블 데이터 개수")
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM tb_con_mst")
            count = cur.fetchone()[0]
            print(f"   총 레코드 수: {count}")
        
        print()
        
        # 3. CD로 검색된 데이터
        print("3. CD로 검색된 데이터")
        test_cds = ["CD318", "CD319", "CD320", "CD401", "CD1003"]
        for cd in test_cds:
            with conn.cursor() as cur:
                cur.execute("SELECT CD, CD_NM, ITEM10, UPDATE_DT FROM tb_con_mst WHERE CD = %s", (cd,))
                data = cur.fetchone()
                
                if data:
                    print(f"   CD: {data[0]}")
                    print(f"      CD_NM: {data[1]}")
                    print(f"      ITEM10: {data[2]}")
                    print(f"      UPDATE_DT: {data[3]}")
                else:
                    print(f"   CD: {cd} - 데이터 없음")
        
        print()
        
        # 4. ITEM10이 존재하는 데이터 샘플
        print("4. ITEM10이 존재하는 데이터 샘플")
        with conn.cursor() as cur:
            cur.execute("SELECT CD, CD_NM, ITEM10, UPDATE_DT FROM tb_con_mst WHERE ITEM10 IS NOT NULL AND ITEM10 != '' LIMIT 10")
            
            for row in cur.fetchall():
                print(f"   CD: {row[0]}")
                print(f"      CD_NM: {row[1]}")
                print(f"      ITEM10: {row[2]}")
                print(f"      UPDATE_DT: {row[3]}")
        
    except Exception as e:
        print(f"오류: {e}")
        import traceback
        print(traceback.format_exc())
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass