<div align="center">

# 🧪 TestPlanner

<p align="center">
  <strong>Git diff를 Claude AI로 분석하여 QA 테스트케이스를 자동 생성하는 웹 애플리케이션</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/버전-1.0.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/라이선스-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" />
</p>

</div>

---

## 📖 소개

**TestPlanner**는 개발자가 코드를 변경한 후 QA 팀이 어떤 테스트를 해야 할지 자동으로 만들어주는 도구입니다.

로컬 Git 저장소 경로 또는 GitHub URL을 입력하면, 두 브랜치(또는 커밋) 사이의 변경된 코드(diff)를 추출하고 Claude AI가 이를 분석하여 **마크다운 형식의 QA 테스트케이스 문서**를 실시간으로 생성합니다.

> 💡 "코드 리뷰 후 테스트케이스 작성에 시간을 너무 많이 씁니다." 라는 문제를 해결합니다.

---

## ✨ 주요 기능

- **🔍 Git 저장소 연동** — 로컬 경로 직접 입력, macOS 폴더 선택 다이얼로그, GitHub URL 클론 모두 지원
- **🌿 브랜치 / 커밋 비교** — 브랜치 간 또는 특정 커밋 범위의 diff를 정밀하게 추출
- **🧠 AI 영향도 분석** — Claude AI가 변경된 파일들의 기능적 영향 범위를 JSON으로 분석
- **📋 테스트케이스 자동 생성** — SSE(Server-Sent Events) 스트리밍으로 TC가 실시간 타이핑되어 화면에 표시
- **🤖 AI 모델 선택** — Haiku(빠름/저렴), Sonnet(균형), Opus(최고품질) 중 목적에 맞게 선택 가능
- **💾 Markdown 저장 & 다운로드** — 생성된 테스트케이스를 `.md` 파일로 즉시 저장 및 다운로드
- **🎨 Apple 디자인 시스템** — Frosted glass, 부드러운 애니메이션의 미려한 UI

---

## 🏗️ 기술 스택

| 구분 | 기술 | 버전 | 역할 |
|------|------|------|------|
| **Frontend** | React | 18 | UI 컴포넌트 |
| | TypeScript | 5 | 타입 안전성 |
| | Vite | 5 | 번들러 / 개발 서버 |
| | TailwindCSS | 3 | 스타일링 |
| | Zustand | 5 | 전역 상태 관리 |
| | Axios | - | HTTP 클라이언트 |
| **Backend** | Node.js | 20 | 런타임 |
| | Express | 4 | REST API 서버 |
| | TypeScript | 5 | 타입 안전성 |
| | simple-git | - | Git diff 추출 |
| | Zod | - | 환경변수 검증 |
| **AI** | Claude API | SDK 0.x | 영향도 분석 / TC 생성 |
| | SSE | - | 실시간 스트리밍 |
| **기타** | npm workspaces | - | 모노레포 관리 |
| | concurrently | - | 동시 서버 실행 |

---

## 🚀 빠른 시작

### Prerequisites (사전 준비)

아래 도구들이 설치되어 있어야 합니다.

```bash
node --version   # v18 이상 필요
npm --version    # v9 이상 필요
git --version    # 아무 버전이나 OK
```

Anthropic API 키가 필요합니다. [console.anthropic.com](https://console.anthropic.com)에서 발급받으세요.

---

### Installation (설치)

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/testplanner.git
cd testplanner

# 2. 전체 의존성 설치 (server + client 동시)
npm install
```

---

### 환경변수 설정

```bash
# 서버 환경변수 파일 생성
cp server/.env.example server/.env
```

`server/.env` 파일을 열어 Anthropic API 키를 입력하세요:

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxx   # 필수: Anthropic 콘솔에서 발급
PORT=3000
OUTPUT_DIR=../output
MAX_DIFF_SIZE=50000
NODE_ENV=development
```

---

### 실행

```bash
# 서버(포트 3000) + 클라이언트(포트 5173) 동시 실행
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173)을 열면 바로 사용 가능합니다.

서버만 또는 클라이언트만 실행하려면:

```bash
npm run dev:server   # Express 서버만 실행 (포트 3000)
npm run dev:client   # Vite 개발 서버만 실행 (포트 5173)
```

프로덕션 빌드:

```bash
npm run build   # server + client 모두 빌드
```

---

## 📁 프로젝트 구조

```
testplanner/
├── package.json                # npm workspaces 루트 (concurrently로 동시 실행)
│
├── server/                     # Express 백엔드
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                    # 환경변수 (gitignore됨)
│   ├── .env.example            # 환경변수 템플릿
│   └── src/
│       ├── index.ts            # 서버 진입점 (CORS, 라우터 등록)
│       ├── config/
│       │   └── env.ts          # Zod로 환경변수 검증
│       ├── routes/
│       │   ├── git.routes.ts         # /api/git/*
│       │   ├── analysis.routes.ts    # /api/analysis/*
│       │   └── testcase.routes.ts    # /api/testcase/*
│       ├── controllers/
│       │   ├── git.controller.ts
│       │   ├── analysis.controller.ts
│       │   └── testcase.controller.ts
│       ├── services/
│       │   ├── git.service.ts        # simple-git 기반 diff 추출
│       │   ├── claude.service.ts     # Claude API 연동 (분석 + 스트리밍)
│       │   ├── analysis.service.ts   # 영향도 분석 로직
│       │   ├── testcase.service.ts   # TC 생성 오케스트레이션
│       │   └── file.service.ts       # MD 파일 저장
│       ├── utils/
│       │   ├── prompt.util.ts        # Claude 프롬프트 빌더
│       │   └── markdown.util.ts      # MD 리포트 포맷터
│       └── types/                    # 공유 TypeScript 타입
│
├── client/                     # React 프론트엔드
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx             # 루트 컴포넌트 (3단계 스텝 UI)
│       ├── main.tsx
│       ├── api/
│       │   └── client.ts       # Axios 기반 API 클라이언트
│       ├── store/
│       │   └── useAppStore.ts  # Zustand 전역 상태
│       └── components/
│           ├── GitConfig/      # Step 1: 저장소 경로 입력 & 브랜치 선택
│           ├── Analysis/       # Step 2: AI 영향도 분석 결과 표시
│           └── TestCase/       # Step 3: TC 실시간 생성 & 다운로드
│
└── output/                     # 생성된 .md 파일 저장 위치 (자동 생성)
```

---

## 📡 API 레퍼런스

모든 API 응답은 아래 형식을 따릅니다:

```typescript
{ success: boolean, data?: T, error?: string }
```

### Git 관련

| Method | Endpoint | 설명 | 요청 Body |
|--------|----------|------|-----------|
| `GET` | `/health` | 서버 상태 확인 | - |
| `POST` | `/api/git/validate` | 저장소 경로 유효성 검사 | `{ repoPath: string }` |
| `POST` | `/api/git/branches` | 브랜치 및 커밋 목록 조회 | `{ repoPath: string }` |
| `POST` | `/api/git/diff` | Git diff 추출 | `{ repoPath, base, head }` |
| `POST` | `/api/git/clone` | GitHub URL에서 저장소 클론 | `{ githubUrl: string }` |
| `POST` | `/api/git/open-dialog` | macOS 폴더 선택 다이얼로그 실행 | - |

### 분석 및 테스트케이스

| Method | Endpoint | 설명 | 요청 Body |
|--------|----------|------|-----------|
| `POST` | `/api/analysis/impact` | Claude AI 영향도 분석 | `{ diff, model? }` |
| `POST` | `/api/testcase/generate` | TC 생성 (SSE 스트리밍) | `{ diff, analysis, projectName?, model? }` |
| `POST` | `/api/testcase/save` | MD 파일 저장 | `{ content, filename? }` |
| `GET` | `/api/testcase/download/:filename` | 저장된 MD 파일 다운로드 | - |

#### SSE 스트리밍 이벤트 형식

`/api/testcase/generate`는 `text/event-stream`으로 응답합니다:

```
data: {"type": "delta", "text": "## 테스트케이스\n"}
data: {"type": "delta", "text": "### TC-001 ..."}
data: {"type": "done", "usage": {"inputTokens": 1234, "outputTokens": 567}}
data: {"type": "error", "message": "오류 메시지"}
```

---

## 🔧 환경변수

`server/.env` 파일에 설정합니다.

| 변수명 | 필수 | 기본값 | 설명 |
|--------|------|--------|------|
| `ANTHROPIC_API_KEY` | ✅ 필수 | - | Anthropic API 키 (`sk-ant-...` 형식) |
| `PORT` | 선택 | `3000` | Express 서버 포트 |
| `OUTPUT_DIR` | 선택 | `../output` | MD 파일 저장 디렉토리 경로 |
| `MAX_DIFF_SIZE` | 선택 | `50000` | diff 최대 크기 (바이트). 초과 시 자동 잘림 |
| `NODE_ENV` | 선택 | `development` | 실행 환경 (`development` \| `production`) |

---

## 🤖 AI 모델 선택 가이드

| 모델 | 속도 | 품질 | Input 가격 | Output 가격 | 추천 용도 |
|------|------|------|-----------|-----------|----------|
| **Haiku 4.5** | ⚡ 빠름 | ★★★☆ | $0.80 / 1M | $4 / 1M | 빠른 초안 확인, 비용 절감 |
| **Sonnet 4.6** | ⚡ 보통 | ★★★★ | $3 / 1M | $15 / 1M | 일반 업무용 (기본값 추천) |
| **Opus 4.6** | 🐢 느림 | ★★★★★ | $15 / 1M | $75 / 1M | 복잡한 레거시 코드 분석 |

---

## 🎬 사용 방법

**Step 1 — 저장소 설정**

로컬 Git 저장소 경로를 직접 입력하거나, 폴더 선택 버튼을 클릭하거나, GitHub URL을 붙여넣습니다. 저장소가 로드되면 비교할 `base` 브랜치와 `head` 브랜치를 선택합니다.

```
예시 경로: /Users/me/projects/my-app
예시 GitHub URL: https://github.com/user/repo.git
```

**Step 2 — 영향도 분석**

"diff 추출" 버튼으로 변경된 파일 목록을 불러온 뒤, "AI 분석 시작"을 클릭합니다. Claude AI가 변경 내용의 기능적 영향 범위를 JSON으로 파싱하여 표시합니다.

**Step 3 — 테스트케이스 생성**

"TC 생성" 버튼을 누르면 SSE 스트리밍으로 마크다운 테스트케이스가 실시간으로 화면에 타이핑됩니다. 생성 완료 후 MD 파일로 저장하거나 즉시 다운로드할 수 있습니다.

---

## 🛠️ 개발자 가이드

### 서버 헬스체크

```bash
curl http://localhost:3000/health
# 응답: {"status":"ok","timestamp":"2026-02-27T00:00:00.000Z"}
```

### TypeScript 타입 체크

```bash
npm run typecheck --workspace=server
npm run typecheck --workspace=client
```

### 주의사항

- `server/.env`는 **절대로 Git에 커밋하지 마세요.** `.gitignore`에 이미 포함되어 있습니다.
- `output/` 디렉토리는 서버 최초 실행 시 자동으로 생성됩니다.
- `MAX_DIFF_SIZE` 초과 시 diff가 잘려서 분석되므로 대규모 PR은 범위를 나눠서 분석하는 것을 권장합니다.
- GitHub URL 클론은 서버의 임시 디렉토리(`/tmp`)에 저장되며, 서버 재시작 시 삭제될 수 있습니다.

---

## 📄 라이선스

MIT License — 자유롭게 사용, 수정, 배포할 수 있습니다.

---

<div align="center">
  <sub>Made with ❤️ using Claude AI · TestPlanner v1.0.0</sub>
</div>
