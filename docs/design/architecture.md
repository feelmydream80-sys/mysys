# 아키텍처 설계 (Architecture)

**Cline 필수 읽기 문서**

## 1. 채택 아키텍처 패턴
- Flask Application Factory + Blueprint
- Repository Pattern 또는 간단한 Service Layer
- Flask-SQLAlchemy 또는 순수 sqlite3 모듈 사용 (현재는 sqlite3 우선)

## 2. 주요 원칙 (PEP 8 + Flask Best Practices)
- 모든 코드에 Type Hint 적극 사용
- 단일 책임 원칙 (SRP)
- 순환 의존성 금지
- Configuration은 `config.py` 또는 환경 변수로 관리

## 3. Cline 작업 지침
- 새로운 Blueprint나 Route 추가 시 architecture.md와 일치하도록 구현
- DB 접근은 반드시 database-design.md의 가이드라인 따를 것