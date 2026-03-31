import requests

try:
    response = requests.get('http://127.0.0.1:5000/api/api_key_mngr/expiry_info')
    print(f"응답 상태 코드: {response.status_code}")
    print(f"응답 내용: {response.json()}")
except Exception as e:
    print(f"오류: {e}")