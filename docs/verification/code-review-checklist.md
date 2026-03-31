**Cline 필수 읽기 문서** — Cline이 스스로 검토할 때 사용

- [ ] system-design.md, architecture.md와 일치하는가?
- [ ] coding-standards.md (PEP 8, Type Hint, Docstring) 준수?
- [ ] database-design.md의 SQLite 연결 및 보안 규칙 준수?
- [ ] Flask Blueprint, Factory 패턴 제대로 사용?
- [ ] 테스트 작성 또는 실행 계획 포함?
- [ ] SQL Injection 방지 (prepared statement 사용)?
- [ ] 에러 처리와 로깅 적절한가?
- [ ] 새로운 의존성 추가 시 tech-stack.md 업데이트?
- [ ] 디버그 로그를 통해서 접근해서 데이터를 확인하였는가?
- [ ] 테스트 종료 후 제대로 보고 했는가?
- [ ] 테스트 하기 전 사용자에게 테스트를 위해 필요한 행위를 설명했는가?
- [ ] 구현 전에 구체적인 작업 순서와 테스트 계획을 사용자에게 설명했는가?
- [ ] 코드 수정 후 즉시 테스트를 실행했는가?
- [ ] 테스트 결과를 구체적으로 보고했는가? (예: "기능 X가 정상 작동합니다" 대신 "불용어 목록이 페이지에 표시되고 페이지네이션이 동작합니다")
- [ ] 사용자에게 테스트 방법을 명확히 전달했는가? (예: "Flask 앱을 실행한 뒤 http://localhost:5001/stopwords에서 확인해주세요")
- [ ] 수정된 범위가 요청한 기능과 일치하는가?
- [ ] 기존 기능에 영향을 주지 않는가?