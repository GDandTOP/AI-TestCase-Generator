# TestPlanner 프로젝트 구조 및 실행 흐름

## 1. 프로젝트 개요

**TestPlanner**는 Git 변경사항(diff)을 Claude AI로 분석하여 **QA 테스터용 테스트케이스**를 자동 생성하는 웹 앱입니다.

- **프론트엔드**: React + TypeScript + Vite + TailwindCSS (포트 **5173**)
- **백엔드**: Node.js + Express + TypeScript (포트 **3000**)
- **AI**: Anthropic Claude API (Haiku/Sonnet/Opus), SSE 스트리밍으로 TC 실시간 생성
- **상태 관리**: Zustand
- **구조**: npm workspaces 모노레포

---

## 2. 디렉터리 구조

```
cicd_test_maker/
├── package.json              # 루트: workspaces, dev/build 스크립트
├── client/                   # 프론트엔드 (React)
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx         # React 진입점
│       ├── App.tsx          # 3단계 스텝 UI, StepIndicator
│       ├── index.css        # 글로벌 스타일
│       ├── api/
│       │   └── client.ts    # axios API 클라이언트 (validateRepo, getBranches, getDiff, analyzeImpact, saveTestCase 등)
│       ├── store/
│       │   └── useAppStore.ts  # Zustand 전역 상태 (Step 1~3 데이터, 로딩/에러)
│       └── components/
│           ├── GitConfig/   # Step 1: 저장소 설정 (로컬/GitHub, 브랜치/커밋/최근 N개, AI 모델 선택)
│           ├── Analysis/    # Step 2: 영향도 분석 결과 표시, TC 생성 버튼
│           └── TestCase/    # Step 3: TC 마크다운 뷰어, 저장/다운로드/복사
├── server/                   # 백엔드 (Express)
│   ├── package.json
│   ├── .env                  # ANTHROPIC_API_KEY 등 (gitignore)
│   └── src/
│       ├── index.ts         # Express 앱, CORS, 라우터 등록, /health
│       ├── config/
│       │   └── env.ts       # zod로 환경변수 검증 (PORT, OUTPUT_DIR, MAX_DIFF_SIZE 등)
│       ├── types/
│       │   └── index.ts     # ApiResponse, GitDiffResult, ImpactAnalysis 등 타입
│       ├── routes/
│       │   ├── git.routes.ts      # /api/git/*
│       │   ├── analysis.routes.ts # /api/analysis/*
│       │   └── testcase.routes.ts # /api/testcase/*
│       ├── controllers/
│       │   ├── git.controller.ts
│       │   ├── analysis.controller.ts
│       │   └── testcase.controller.ts
│       ├── services/
│       │   ├── git.service.ts     # simple-git: validate, clone, getBranches, getDiff
│       │   ├── claude.service.ts  # Claude API: 영향도 분석, TC 스트리밍
│       │   ├── analysis.service.ts
│       │   ├── testcase.service.ts
│       │   └── file.service.ts    # output 디렉터리 MD 저장/조회
│       └── utils/
│           ├── prompt.util.ts     # Claude용 프롬프트 생성
│           └── markdown.util.ts   # 보고서 헤더/푸터, 파일명 생성
└── output/                   # 생성된 MD 파일 저장 (자동 생성)
```

---

## 3. 실행 흐름 (전체)

### 3.1 앱 기동

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 서버(3000) + 클라이언트(5173) 동시 실행 (concurrently) |
| `npm run dev:server` | Express 서버만 실행 |
| `npm run dev:client` | Vite 개발 서버만 실행 |

- **클라이언트**: `main.tsx` → `App.tsx` 렌더링. `useAppStore`의 `currentStep`(1/2/3)에 따라 `GitConfig` / `Analysis` / `TestCase` 중 하나가 표시됩니다.
- **서버**: `index.ts`에서 CORS(`http://localhost:5173`), JSON body, `/api/git`, `/api/analysis`, `/api/testcase` 라우터를 등록하고 `env.PORT`로 리스닝합니다.

---

### 3.2 Step 1: 저장소 설정 (GitConfig)

**사용자 동작**  
저장소 유형 선택(로컬 경로 / GitHub URL) → 경로 또는 URL 입력 → (로컬) "저장소 확인" 또는 "폴더 선택" / (GitHub) "클론하기" → 브랜치/커밋/최근 N개 선택, AI 모델 선택 → **"분석 시작"** 클릭.

**실행 흐름**:

1. **로컬 저장소**
   - **저장소 확인**: `POST /api/git/validate` → `GitService.validateRepo()` → 성공 시 `POST /api/git/branches` → `GitService.getBranches()` + `getRecentCommits(20)` → 스토어에 `branches`, `commits` 저장.
   - **폴더 선택**: `GET /api/git/open-folder` → 서버에서 `osascript`로 macOS 폴더 선택 다이얼로그 → 선택 경로 반환 후 위와 같이 validate → branches 호출.

2. **GitHub URL**
   - `POST /api/git/clone` → `GitService.cloneRepo(githubUrl)` (임시 디렉터리에 `--depth 50` 클론) → 반환된 `repoPath`로 `POST /api/git/branches` 호출 → 스토어에 동일하게 반영.

3. **분석 시작** (GitConfig 내 `handleAnalyze`)
   - `setLoading(true, 'diff 추출 중...')`
   - `POST /api/git/diff` (repoPath, compareType, base/head/count) → `GitController.getDiff` → `GitService.getDiffByBranch` / `getDiffByCommit` / `getDiffByRecentCommits` → diff 크기 제한(MAX_DIFF_SIZE) 적용 후 `GitDiffResult` 반환.
   - 스토어에 `setDiffResult(diff)`.
   - `setLoading(true, 'Claude AI로 영향도 분석 중...')`
   - `POST /api/analysis/impact` (diff, model) → `AnalysisController.analyzeImpact` → `AnalysisService.analyzeImpact` → `ClaudeService.analyzeImpact` (프롬프트 생성 → Claude API `messages.create` → JSON 파싱) → `ImpactAnalysis` 반환.
   - 스토어에 `setImpactAnalysis(analysis)`.
   - `goToStep(2)` → **Step 2 화면(영향도 분석 결과)** 으로 전환.

---

### 3.3 Step 2: 영향도 분석 (Analysis)

**표시 내용**  
전체 위험도, 변경 통계(파일 수, +/- 라인), 변경 파일 목록, 영향 받는 기능 영역, 테스트 권고사항.  
**사용자 동작**: **"테스트케이스 생성"** 클릭.

**실행 흐름**:

1. `setLoading(true, 'TC 생성 중...')`, `setTcContent('')`, `setHeaderContent('')`.
2. `POST /api/testcase/generate` (fetch, body: diff, analysis, projectName, compareSummary, model).
3. **서버**: `TestCaseController.generateTestCases` → `TestCaseService.generateStream`:
   - `buildReportHeader(...)`로 헤더 문자열 생성 → `res.write('data: {"type":"header","text":...}\n\n')` (SSE).
   - `ClaudeService.generateTestCasesStream(diff, analysis, res, projectName, model)`:
     - `buildTestCasePrompt(diff, analysis, projectName)`로 프롬프트 생성.
     - `Content-Type: text/event-stream` 설정.
     - Claude `messages.stream()` 호출 → 스트림 청크마다 `res.write('data: {"type":"delta","text":"..."}\n\n')`.
     - 스트림 종료 후 `data: {"type":"done", "usage":...}\n\n` 전송 후 `res.end()`.
4. **클라이언트**: `response.body.getReader()`로 스트림 읽기 → 줄 단위로 파싱해 `data: ` 뒤 JSON 처리:
   - `type === 'header'` → `setHeaderContent(json.text)`.
   - `type === 'delta'` → `appendTcContent(json.text)`.
5. `goToStep(3)` 호출 → **Step 3(테스트케이스)** 로 전환. (로딩은 스트림 읽는 동안 유지 가능)

---

### 3.4 Step 3: 테스트케이스 (TestCase)

**표시**  
`headerContent + tcContent`를 ReactMarkdown으로 렌더링.  
**사용자 동작**: **MD 파일 저장**, **다운로드**, **복사**, **처음으로 돌아가기**.

**실행 흐름**:

1. **저장**
   - `POST /api/testcase/save` (content, diff, analysis, projectName, compareSummary).
   - 서버: `TestCaseController.saveTestCase` → `TestCaseService.saveReport` → `buildReportHeader` + content + `buildReportFooter` 합친 뒤 `FileService.saveMarkdown` → `output/` 디렉터리에 파일 저장, 파일명 반환.
   - 스토어에 `setSavedFilename(filename)`.

2. **다운로드**
   - `GET /api/testcase/download/:filename` → `downloadTestCase` → `FileService.getFilePath` 후 `res.download(filePath, safeName)`.

3. **처음으로**
   - `store.reset()` → Zustand 상태를 초기값으로 되돌림.

---

## 4. API 요약

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| POST | `/api/git/validate` | 저장소 경로 유효성 검사 |
| GET | `/api/git/open-folder` | macOS 폴더 선택 다이얼로그, 선택 경로 반환 |
| POST | `/api/git/clone` | GitHub URL → 임시 디렉터리 클론, repoPath 반환 |
| POST | `/api/git/branches` | 브랜치 목록 + 최근 20개 커밋 |
| POST | `/api/git/diff` | Git diff 추출 (branch/commit/recent) |
| POST | `/api/analysis/impact` | Claude로 영향도 분석 (JSON 응답) |
| POST | `/api/testcase/generate` | TC 생성 (SSE 스트리밍) |
| POST | `/api/testcase/save` | MD 파일로 저장 |
| GET | `/api/testcase/download/:filename` | MD 파일 다운로드 |
| GET | `/api/testcase/list` | 저장된 TC 파일 목록 |

---

## 5. 데이터 흐름 요약

```
[사용자] Step 1
    → 저장소 연결(로컬/GitHub) → validate / clone → branches
    → 비교 방식 선택(branch/commit/recent) + AI 모델 선택
    → "분석 시작"
        → getDiff → diffResult
        → analyzeImpact(diff) → impactAnalysis
        → goToStep(2)

[사용자] Step 2
    → "테스트케이스 생성"
        → POST /api/testcase/generate (SSE)
        → header 이벤트 → headerContent
        → delta 이벤트 → appendTcContent (실시간 누적)
        → goToStep(3)

[사용자] Step 3
    → "MD 파일 저장" → saveReport → output/*.md
    → "다운로드" → download/:filename
    → "처음으로" → reset()
```

---

## 6. 주요 기술 포인트

- **Git**: 서버의 `simple-git`으로만 접근 (경로/클론은 서버에서만 수행).
- **Claude**: 영향도 분석은 한 번에 JSON 응답, TC 생성은 `messages.stream()` + SSE로 스트리밍.
- **환경변수**: `server/.env` + `config/env.ts`의 zod 스키마로 검증 (ANTHROPIC_API_KEY 필수).
- **에러 처리**: API는 `{ success, data?, error? }` 형식 통일; 클라이언트는 axios interceptor와 스토어 `setError`로 표시.

이 문서는 프로젝트 구조와 실행 흐름을 한눈에 보기 위해 작성되었습니다.
