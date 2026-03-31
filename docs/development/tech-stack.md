# 기술 스택 (Tech Stack)

**Cline 필수 읽기 문서**

## 현재 스택
- Language: Python 3.11+
- Web Framework: Flask (Blueprint + Factory Pattern)
- Database: SQLite (개발/테스트용)
- ORM/쿼리: sqlite3 기본 모듈 (필요 시 Flask-SQLAlchemy 추가 가능)
- 패키지 관리: pip 또는 uv / requirements.txt
- 테스트: pytest
- 기타: python-dotenv, Flask-Login (필요 시), Werkzeug

**Cline 지침**: 새로운 패키지 추가 시 반드시 이 파일에 기록하고 사용자 승인 후 진행