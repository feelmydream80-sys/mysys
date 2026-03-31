# 시스템 전체 설계 (System Design)

**Cline 필수 읽기 문서** — Python + Flask + SQLite 프로젝트

## 1. 프로젝트 개요
- 언어: Python 3.11+
- 웹 프레임워크: Flask (Blueprint + Application Factory 패턴 사용)
- 데이터베이스: SQLite (초기 뼈대용, 나중에 PostgreSQL 등으로 전환 가능)
- 목표: 확장 가능하고 유지보수하기 쉬운 Flask 애플리케이션

## 2. 고수준 아키텍처
- Application Factory 패턴 (`create_app()`)
- Blueprint로 모듈화 (routes, services, models 분리)
- Layered 구조: routes → services → models/repositories

## 3. Cline 작업 지침
- 모든 새로운 기능은 **이 문서를 먼저 읽고** 기존 설계와 비교
- 설계와 충돌하거나 모호한 요구사항이 있으면 반드시 `🔍 요구사항 검토 결과` 형식으로 의문 제기
- SQLite는 개발/테스트용으로 사용. 프로덕션 DB 전환 시 database-design.md 업데이트 필수