# 데이터베이스 설계 (Database Design)

**Cline 필수 읽기 문서** — SQLite 중심

## 1. DB 설계 원칙
- SQLite 파일: `instance/app.db` (Flask 권장 위치)
- 테이블 설계 시 정규화 고려 (1NF ~ 3NF)
- Primary Key, Foreign Key, Index 적절히 사용
- Migration은 Flask-Migrate 또는 수동 스크립트로 관리

## 2. 연결 방식 (Flask Best Practice)
```python
from flask import g
import sqlite3

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect('instance/app.db')
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()