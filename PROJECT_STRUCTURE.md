# PROJECT_STRUCTURE.md

## 전체 개요
Git diff를 AI로 분석해 QA 테스트케이스를 자동 생성하는 **npm workspaces 모노레포** 웹앱입니다.

---

## 아키텍처

```
testplanner/
├── server/          # Node.js + Express + TypeScript (포트 3000)
└── client/          # React + Vite + TailwindCSS (포트 5173)
```

---

## 백엔드 (`server/src/`)

### 계층 구조

| 계층 | 파일 | 역할 |
|------|------|------|
| Routes | `git/analysis/testcase.routes.ts` | URL 라우팅 |
| Controllers | `git/analysis/testcase.controller.ts` | 요청 처리, 에러 핸들링 |
| Services | 아래 참고 | 비즈니스 로직 |
| Utils | `prompt/markdown/pdf/log...` | 공통 유틸 |

### 핵심 서비스

- `git.service.ts` — simple-git 기반 diff/브랜치/커밋 추출, GitHub 클론
- `claude.service.ts` — Anthropic SDK, 영향도 분석(일반 호출) + TC 생성(SSE 스트리밍)
- `kt-codi.service.ts` — KT AI Codi REST API 연동 (streaming SSE 방식)
- `testcase.service.ts` — TC 생성 오케스트레이션 + MD/PDF 저장
- `project-context.service.ts` — 프로젝트 구조 문서 생성

### AI 모델 분기 로직 (`testcase.controller.ts:32`)

```
isKtAiCodiModel(m) → KtCodiService
else               → ClaudeService (Anthropic SDK)
```

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| POST | `/api/git/validate` | 저장소 경로 유효성 검사 |
| POST | `/api/git/branches` | 브랜치/커밋 목록 조회 |
| POST | `/api/git/diff` | Git diff 추출 |
| POST | `/api/analysis/impact` | Claude AI 영향도 분석 |
| POST | `/api/testcase/generate` | TC 생성 (SSE 스트리밍) |
| POST | `/api/testcase/save` | MD 파일 저장 |
| POST | `/api/testcase/save-pdf` | PDF 파일 저장 |
| POST | `/api/testcase/export-pdf` | PDF 즉시 다운로드 (서버 저장 없음) |
| GET | `/api/testcase/download/:filename` | MD/PDF 파일 다운로드 |

---

## 프론트엔드 (`client/src/`)

### 3단계 위저드 구조

| Step | 컴포넌트 | 기능 |
|------|----------|------|
| 1 | `GitConfig` | 로컬/GitHub 저장소 연결, AI 모델 선택, 비교 방식(브랜치/커밋/최근N개) 설정 |
| 2 | `Analysis` | diff 파일 목록 + 영향도 분석 결과 표시 |
| 3 | `TestCase` | TC 실시간 스트리밍 렌더링, MD/PDF 다운로드 |

### 상태 관리 (`useAppStore.ts` — Zustand)

- 전역 상태로 전 단계 데이터 공유
- `projectContextDocument`: 브랜치 로드 시 1회 저장, 이후 분석/TC 생성에 재사용
- 지원 모델: Haiku 4.5 / Sonnet 4.6 / Opus 4.6 / KT AI Codi

### 주요 타입 (`useAppStore.ts`)

```typescript
DiffFile         // path, status, insertions, deletions
GitDiffResult    // files[], rawDiff, stats
AffectedArea     // name, risk, description, files
ImpactAnalysis   // overallRisk, affectedAreas, summary, recommendations
CommitInfo       // hash, message, date
ClaudeModelId    // 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6' | 'claude-opus-4-6' | 'kt-ai-codi'
```

---

## SSE 스트리밍 이벤트 형식

```json
{ "type": "header", "text": "..." }
{ "type": "delta",  "text": "..." }
{ "type": "done",   "usage": { "inputTokens": 0, "outputTokens": 0 } }
{ "type": "error",  "error": "..." }
```

> KT Codi 모델만 `header` 이벤트를 먼저 전송합니다 (보고서 상단 1~2절 고정 텍스트).

---

## 주목할 파일

| 파일 | 역할 |
|------|------|
| `server/src/utils/prompt.util.ts` | Claude/Codi 프롬프트 빌더 |
| `server/src/utils/codi-sse.util.ts` | KT Codi SSE 응답 파서 |
| `server/src/utils/markdown.util.ts` | MD 보고서 포맷 생성 |
| `server/src/utils/pdf.util.ts` | MD → PDF 변환 |
| `server/src/utils/log-payload.util.ts` | 개발 환경 payload 로깅 |
| `server/src/config/env.ts` | Zod 환경변수 검증 |
| `server/src/utils/claude-error.util.ts` | LLM 에러 메시지 정규화 |

---

## 실행 흐름

```
저장소 입력 → 브랜치 로드 + 프로젝트 구조 문서 생성
  → diff 추출 → AI 영향도 분석(JSON) → Step 2
  → TC 생성 요청 → SSE 스트리밍 실시간 렌더링 → Step 3
  → MD / PDF 저장 및 다운로드
```

---

## 환경변수 (`server/.env`)

| 변수 | 필수 | 설명 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Claude 사용 시 | Anthropic API 키 |
| `CODI_API_KEY` | KT Codi 사용 시 | KT AI Codi API 키 |
| `CODI_API_BASE_URL` | KT Codi 사용 시 | KT Codi 엔드포인트 |
| `PORT` | 선택 | 서버 포트 (기본 3000) |
| `OUTPUT_DIR` | 선택 | 출력 디렉토리 (기본 ../output) |
| `MAX_DIFF_SIZE` | 선택 | 최대 diff 크기 (기본 50,000자) |
| `NODE_ENV` | 선택 | 환경 (development/production) |
