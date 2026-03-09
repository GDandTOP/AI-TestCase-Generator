# CLAUDE.md - TestPlanner 프로젝트 가이드

## 프로젝트 개요
Git 변경사항(diff)을 Claude AI로 분석하여 QA 테스터용 테스트케이스를 자동 생성하는 웹 앱.

## 아키텍처
- Frontend: React + TypeScript + Vite + TailwindCSS (포트 5173)
- Backend: Node.js + Express + TypeScript (포트 3000)
- AI: Claude API (claude-haiku-4-5-20251001), SSE 스트리밍으로 TC 실시간 생성
- 상태 관리: Zustand
- npm workspaces 모노레포 구조

## 디렉토리 구조
```
testplanner/
├── package.json              # npm workspaces 루트
├── server/
│   ├── src/
│   │   ├── index.ts          # Express 서버 (포트 3000)
│   │   ├── config/env.ts     # 환경변수 (zod 검증)
│   │   ├── routes/           # git, analysis, testcase 라우터
│   │   ├── controllers/      # 요청 처리
│   │   ├── services/
│   │   │   ├── git.service.ts      # simple-git 기반 diff 추출
│   │   │   ├── claude.service.ts   # Claude API 연동
│   │   │   ├── analysis.service.ts
│   │   │   ├── testcase.service.ts
│   │   │   └── file.service.ts     # MD 파일 저장
│   │   └── utils/
│   │       ├── prompt.util.ts      # Claude 프롬프트 생성
│   │       └── markdown.util.ts    # MD 보고서 포맷
│   └── .env                  # 환경변수 (gitignore됨)
├── client/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── GitConfig/    # Step 1: 저장소 설정
│       │   ├── Analysis/     # Step 2: 영향도 분석
│       │   └── TestCase/     # Step 3: TC 생성 및 다운로드
│       ├── api/client.ts     # axios 기반 API 클라이언트
│       └── store/useAppStore.ts  # Zustand 전역 상태
└── output/                   # 생성된 MD 파일 저장
```

## 개발 환경 설정
```bash
npm install
cp server/.env.example server/.env
# server/.env에서 ANTHROPIC_API_KEY 설정
npm run dev
```

## 주요 환경변수 (server/.env)
```
ANTHROPIC_API_KEY=sk-ant-xxxxx   # 필수
PORT=3000
OUTPUT_DIR=../output
MAX_DIFF_SIZE=50000
NODE_ENV=development
```

## API 엔드포인트
| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| POST | `/api/git/validate` | 저장소 경로 유효성 검사 |
| POST | `/api/git/branches` | 브랜치/커밋 목록 조회 |
| POST | `/api/git/diff` | Git diff 추출 |
| POST | `/api/analysis/impact` | Claude AI 영향도 분석 |
| POST | `/api/testcase/generate` | TC 생성 (SSE 스트리밍) |
| POST | `/api/testcase/save` | MD 파일 저장 |
| GET | `/api/testcase/download/:filename` | MD 파일 다운로드 |

## Claude API 사용 패턴
- **영향도 분석**: `messages.create()` → JSON 응답 파싱
- **TC 생성**: `messages.stream()` → SSE 스트리밍 (text/event-stream)
- **모델**: `claude-haiku-4-5-20251001`
- SSE 이벤트 형식: `data: {"type": "delta"|"header"|"done", "text": "..."}`

## API 응답 형식
모든 API는 통일된 형식으로 응답:
```typescript
{ success: boolean, data?: T, error?: string }
```

## 코딩 컨벤션
- 에러 메시지: 한국어
- git 저장소 경로는 서버 사이드에서만 처리 (보안)
- TypeScript strict 모드 사용
- 컨트롤러에서 try/catch, 서비스에서 비즈니스 로직 분리

## 검증 방법
1. `npm run dev:server` → `http://localhost:3000/health` 응답 확인
2. `npm run dev:client` → `http://localhost:5173` 접속
3. 실제 git 저장소 경로 입력 → 브랜치 목록 로딩
4. diff 추출 → 변경 파일 목록 표시
5. 영향도 분석 → Claude AI JSON 응답 파싱
6. TC 생성 → SSE 스트리밍 실시간 렌더링
7. 저장 → `output/` 디렉토리에 MD 파일 생성

## 주의사항
- `server/.env`는 절대 커밋하지 않음 (`.gitignore` 추가 필요)
- `output/` 디렉토리는 자동 생성됨
- MAX_DIFF_SIZE 초과 시 diff가 잘림 (기본 50,000자)
- SSE 스트리밍 중 에러 발생 시 `data: {"type": "error"}` 이벤트로 처리
