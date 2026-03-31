import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from msys.database import get_db_connection

def check_api_key_data():
    print("=== TB_API_KEY_MNGR 테이블 데이터 확인 ===")
    
    try:
        # DB 연결
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 직접 SQL 쿼리 실행
        cursor.execute("SELECT COUNT(*) FROM TB_API_KEY_MNGR")
        count = cursor.fetchone()[0]
        print(f"테이블 데이터 개수: {count}")
        
        # 모든 데이터 조회
        if count > 0:
            print("\n=== 모든 데이터 ===")
            cursor.execute("SELECT * FROM TB_API_KEY_MNGR")
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                row_dict = dict(zip(columns, row))
                print(row_dict)
        
        # 프론트엔드에서 데이터를 가져오는 로직과 비교
        print("\n=== 서비스 메서드에서 데이터 가져오기 ===")
        from service.api_key_mngr_service import ApiKeyMngrService
        service = ApiKeyMngrService()
        service_data = service.get_all_api_key_mngr()
        print(f"서비스 메서드 반환 개수: {len(service_data)}")
        if service_data:
            for item in service_data:
                print(item)
        
        # CD1001 데이터 확인
        print("\n=== CD1001 데이터 특정 조회 ===")
        service_data_cd1001 = service.get_api_key_mngr_by_cd("CD1001")
        print("서비스 메서드에서 CD1001:")
        if service_data_cd1001:
            print(service_data_cd1001)
        else:
            print("CD1001 데이터 없음")
        
        print("\n=== DB에서 CD1001 직접 조회 ===")
        cursor.execute("SELECT * FROM TB_API_KEY_MNGR WHERE CD = 'CD1001'")
        row = cursor.fetchone()
        if row:
            row_dict = dict(zip(columns, row))
            print(row_dict)
        else:
            print("CD1001 데이터 없음")
            
    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        print("\n상세 오류 스택:")
        print(traceback.format_exc())
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_api_key_data()