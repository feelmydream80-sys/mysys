# 테스트 전략 (Testing Strategy)

**Cline 필수 읽기 문서**

## 1. 테스트 원칙
- pytest 사용
- Unit Test: 모델, 서비스 함수
- Integration Test: Flask test client + SQLite in-memory DB (`:memory:`)
- 항상 Edge case와 Error case 테스트

## 2. Flask 테스트 패턴
```python
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['DATABASE'] = ':memory:'
    with app.test_client() as client:
        yield client