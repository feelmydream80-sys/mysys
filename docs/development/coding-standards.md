**Cline 필수 읽기 문서** — Python + Flask

## 1. 기본 규칙 (PEP 8 + Best Practices)
- Black 또는 Ruff로 포맷팅
- Type Hint everywhere (`from __future__ import annotations`)
- Google 스타일 Docstring
- 의미 있는 변수/함수명 사용
- Early return, Guard Clause 적극 활용

## 2. Flask 전용 규칙
- Blueprint 이름은 snake_case
- Route 함수는 명확한 이름 (`get_users`, `create_post` 등)
- Configuration은 `Config` 클래스 상속
- Error handling: try/except 최소화하고 Flask errorhandler 활용

## 3. Cline 전용 규칙
- 코드 생성 전 Plan Mode에서 설계 문서 확인
- Hard-coded 값 금지 → config 또는 .env로 이동
- 모든 public 함수/클래스에 Docstring 작성