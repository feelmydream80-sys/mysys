# 개발 환경 설정 (Setup)

**Cline 필수 읽기 문서**

## 1. 초기 설정 단계
1. Python 3.11+ 설치
2. 가상환경 생성: `python -m venv venv`
3. 활성화: `source venv/bin/activate` (Windows: `venv\Scripts\activate`)
4. 의존성 설치: `pip install -r requirements.txt`
5. `.env` 파일 생성 (`.env.example` 참조)
6. DB 초기화: `python init_db.py` 또는 Flask CLI 명령

## 2. 실행 명령
- 개발 서버: `flask run` 또는 `python run.py`
- 테스트: `pytest`
- DB 초기화 스크립트는 Cline이 필요 시 자동 생성 가능

**Cline은 setup.md를 읽고 필요한 명령을 제안하거나 실행할 수 있음**