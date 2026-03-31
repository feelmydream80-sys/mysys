# API 설계 (API Design)

**Cline 필수 읽기 문서**

## 1. API 디자인 원칙
- RESTful 원칙 준수 (Resource 중심 URL)
- JSON 응답 표준화 (`{"status": "success", "data": {...}}` 또는 error 형식)
- 에러 처리: Flask errorhandler 사용, 명확한 에러 메시지
- Pagination, Filtering 필요 시 명세

## 2. Cline 작업 지침
- 새로운 엔드포인트는 반드시 이 파일에 먼저 명세 기록
- Route는 Blueprint로 분리 (`app/blueprints/xxx.py`)
- Input validation은 Marshmallow 또는 Pydantic (선택) 또는 간단한 wtforms 사용