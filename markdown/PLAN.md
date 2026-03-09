# TestPlanner - 구현 계획

## Context
Git diff를 분석하여 QA 테스터용 테스트케이스를 자동 생성하는 웹 도구를 만든다.
Claude AI API를 활용해 변경된 코드의 영향도를 파악하고, 시나리오 기반 TC를 마크다운 파일로 생성한다.

**사용자 선택 사항:**
- 입력 방식: Git diff 자동 분석 (로컬 저장소에서 직접 추출)
- 언어: TypeScript + Node.js
- TC 수준: 중간 수준 (시나리오 기반, 예상 결과 포함)
- 배포: Web UI (React + Vite)

---

## 프로젝트 구조

```
testplanner/
├── CLAUDE.md
├── package.json                  # npm workspaces 루트
├── server/
│   └── src/
│       ├── index.ts              # Express 서버 진입점
│       ├── config/env.ts
│       ├── routes/               # git, analysis, testcase 라우터
│       ├── controllers/
│       ├── services/
│       │   ├── git.service.ts    # simple-git 기반 diff 추출
│       │   ├── claude.service.ts # Claude API (분석 + TC 스트리밍)
│       │   ├── analysis.service.ts
│       │   ├── testcase.service.ts
│       │   └── file.service.ts   # MD 파일 저장/다운로드
│       ├── types/
│       └── utils/
│           ├── prompt.util.ts
│           └── markdown.util.ts  # 보고서 포맷 생성
├── client/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── GitConfig/        # 저장소 경로 입력, 브랜치 선택
│       │   ├── Analysis/         # 영향도 분석 결과 표시
│       │   └── TestCase/         # TC 목록 + 다운로드 버튼
│       ├── hooks/
│       ├── api/client.ts
│       └── store/useAppStore.ts  # Zustand 상태 관리
└── output/                       # 생성된 MD 파일 저장
```

---

## 구현 단계

### Phase 1: 기반 설정
- [x] npm workspaces 설정 (루트 package.json)
- [x] server: Express + TypeScript 세팅 (ts-node-dev)
- [x] client: Vite + React + TypeScript + TailwindCSS 세팅
- [x] `server/.env.example` 작성 (`ANTHROPIC_API_KEY` 등)
- [x] `CLAUDE.md` 작성

### Phase 2: 백엔드 핵심 기능
- [x] `git.service.ts` - simple-git 기반 diff 추출
  - 저장소 유효성 검사
  - 브랜치/커밋/최근N개 비교 방식 지원
- [x] `claude.service.ts` - Claude API 연동
  - 영향도 분석: `messages.create()` → JSON 응답 파싱
  - TC 생성: `messages.stream()` → SSE 스트리밍
  - 모델: `claude-opus-4-6`
- [x] `markdown.util.ts` - 구조화된 MD 보고서 포맷
- [x] `file.service.ts` - output/ 디렉토리에 저장 + 다운로드
- [x] 라우트 연결

### Phase 3: 프론트엔드 UI
- [x] 기본 레이아웃 (헤더 + 메인 3단계 UI)
- [x] Step 1: 저장소 경로 입력 + 비교 방식 선택
- [x] Step 2: diff 미리보기 + 영향도 분석 결과
- [x] Step 3: TC 목록 실시간 스트리밍 렌더링
- [x] MD 다운로드 버튼

### Phase 4: 통합 및 CLAUDE.md 생성
- [x] 프론트-백엔드 연동 테스트
- [x] 에러 처리 (네트워크 오류, API 한도 초과)
- [x] `CLAUDE.md` 프로젝트 맞춤형 내용으로 완성

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| POST | `/api/git/validate` | 저장소 경로 유효성 검사 |
| POST | `/api/git/branches` | 브랜치 목록 조회 |
| POST | `/api/git/diff` | Git diff 추출 |
| POST | `/api/analysis/impact` | Claude AI 영향도 분석 |
| POST | `/api/testcase/generate` | TC 생성 (SSE 스트리밍) |
| POST | `/api/testcase/save` | MD 파일 저장 |
| GET | `/api/testcase/download/:filename` | MD 파일 다운로드 |

---

## 생성 파일 목록

| # | 파일 경로 | 설명 |
|---|-----------|------|
| 1 | `package.json` | 루트 - npm workspaces |
| 2 | `server/package.json` | 서버 의존성 |
| 3 | `server/tsconfig.json` | 서버 TypeScript 설정 |
| 4 | `client/package.json` | 클라이언트 의존성 |
| 5 | `client/tsconfig.json` | 클라이언트 TypeScript 설정 |
| 6 | `client/vite.config.ts` | Vite + 프록시 설정 |
| 7 | `server/src/index.ts` | Express 서버 진입점 |
| 8 | `server/src/config/env.ts` | 환경변수 (zod 검증) |
| 9 | `server/src/types/index.ts` | 공통 타입 정의 |
| 10 | `server/src/services/git.service.ts` | simple-git diff 추출 ★ |
| 11 | `server/src/services/claude.service.ts` | Claude API 연동 ★ |
| 12 | `server/src/services/analysis.service.ts` | 영향도 분석 서비스 |
| 13 | `server/src/services/testcase.service.ts` | TC 생성 서비스 |
| 14 | `server/src/services/file.service.ts` | MD 파일 저장/조회 |
| 15 | `server/src/utils/prompt.util.ts` | Claude 프롬프트 생성 ★ |
| 16 | `server/src/utils/markdown.util.ts` | MD 보고서 포맷 ★ |
| 17 | `server/src/routes/git.routes.ts` | Git 라우터 |
| 18 | `server/src/routes/analysis.routes.ts` | 분석 라우터 |
| 19 | `server/src/routes/testcase.routes.ts` | TC 라우터 |
| 20 | `server/src/controllers/git.controller.ts` | Git 컨트롤러 |
| 21 | `server/src/controllers/analysis.controller.ts` | 분석 컨트롤러 |
| 22 | `server/src/controllers/testcase.controller.ts` | TC 컨트롤러 |
| 23 | `client/src/main.tsx` | React 진입점 |
| 24 | `client/src/index.css` | TailwindCSS 글로벌 스타일 |
| 25 | `client/src/App.tsx` | 루트 컴포넌트 (스텝 인디케이터) |
| 26 | `client/src/store/useAppStore.ts` | Zustand 전역 상태 |
| 27 | `client/src/api/client.ts` | axios API 클라이언트 |
| 28 | `client/src/components/GitConfig/GitConfig.tsx` | Step 1 UI |
| 29 | `client/src/components/Analysis/Analysis.tsx` | Step 2 UI |
| 30 | `client/src/components/TestCase/TestCase.tsx` | Step 3 UI |
| 31 | `CLAUDE.md` | 프로젝트 가이드 |
| 32 | `server/.env.example` | 환경변수 예시 |
| 33 | `.gitignore` | Git 제외 목록 |

---

## 생성될 TC MD 파일 형식

```markdown
# 테스트케이스 보고서

## 문서 정보
| 항목 | 내용 |
|------|------|
| 프로젝트 | [프로젝트명] |
| 생성 일시 | YYYY-MM-DD HH:MM:SS |
| 분석 기준 | main...feature/xxx |
| 전체 위험도 | 높음 (High) |

## 1. 변경사항 요약
### 파일 변경 통계
...

## 2. 영향도 분석
### 영향 받는 기능 영역
...

## 3. 테스트케이스
### TC-001: [제목]
- **우선순위**: P1
- **사전 조건**:
- **테스트 시나리오**:
- **실행 단계**:
  1. ...
- **예상 결과**:

## 4. 테스트 실행 체크리스트
- [ ] 모든 P1 테스트케이스 실행 완료
...
```

---

## CLAUDE.md 핵심 내용

```markdown
# CLAUDE.md - TestPlanner 프로젝트 가이드

## 프로젝트 개요
Git 변경사항(diff)을 Claude AI로 분석하여 QA 테스터용 TC를 자동 생성하는 웹 앱.

## 아키텍처
- Frontend: React + TypeScript + Vite + TailwindCSS (포트 5173)
- Backend: Node.js + Express + TypeScript (포트 3000)
- AI: Claude API (claude-opus-4-6), SSE 스트리밍으로 TC 실시간 생성

## 개발 환경 설정
npm install && cp server/.env.example server/.env
# ANTHROPIC_API_KEY 설정 후 npm run dev

## Claude API 사용 패턴
- 영향도 분석: messages.create() → JSON 응답
- TC 생성: messages.stream() → SSE 스트리밍
- 모델: claude-opus-4-6

## 코딩 컨벤션
- API 응답: { success, data?, error? } 통일
- 에러 메시지: 한국어
- git 저장소 경로는 서버 사이드에서만 처리
```

---

## 주요 의존성

### 서버
| 패키지 | 용도 |
|--------|------|
| `@anthropic-ai/sdk` | Claude API |
| `express` + `cors` | HTTP 서버 |
| `simple-git` | Git 조작 |
| `dotenv` | 환경변수 로드 |
| `zod` | 환경변수 유효성 검사 |
| `typescript`, `ts-node-dev` | TypeScript 개발 환경 |

### 클라이언트
| 패키지 | 용도 |
|--------|------|
| `react`, `react-dom` | UI 프레임워크 |
| `vite` | 빌드 툴 |
| `axios` | HTTP 클라이언트 |
| `zustand` | 상태 관리 |
| `react-markdown` | MD 렌더링 |
| `tailwindcss` | CSS 유틸리티 |

---

## 검증 방법

1. **서버 실행**: `npm run dev:server` → `http://localhost:3000/health` 응답 확인
2. **클라이언트 실행**: `npm run dev:client` → `http://localhost:5173` 접속
3. **기능 검증**:
   - 실제 git 저장소 경로 입력 → 브랜치 목록 로딩 확인
   - diff 추출 → 변경 파일 목록 표시 확인
   - 영향도 분석 → Claude AI 응답 JSON 파싱 확인
   - TC 생성 → SSE 스트리밍으로 실시간 텍스트 렌더링 확인
   - MD 다운로드 → `output/` 디렉토리에 파일 생성 확인

---

*생성일: 2026-02-27*
