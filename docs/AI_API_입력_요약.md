# AI API에 던지는 정보 요약

Claude API에는 **프롬프트 문자열 하나**만 보냅니다. 아래 내용이 그 문자열 안에 들어갑니다.

---

## 1. 영향도 분석 (POST /api/analysis/impact)

| 구분 | 내용 |
|------|------|
| **프로젝트 구조** | (선택) 저장소 스캔으로 만든 문서 1개 — package.json 요약, 디렉터리 트리, README 앞부분 |
| **역할 지시** | "QA 전문가, Git diff로 영향도 평가" |
| **변경 파일 목록** | `경로, 상태(added/modified 등), +N/-N` 줄 단위 |
| **변경 통계** | 파일 수, 추가 라인 수, 삭제 라인 수 |
| **Diff 본문** | `rawDiff` **최대 15,000자** (초과분 잘림) |
| **응답 형식** | JSON 스키마 (overallRisk, summary, affectedAreas, recommendations) |

**API 파라미터**: `model`, `max_tokens: 2048`, `messages: [{ role: 'user', content: prompt }]`

---

## 2. 테스트케이스 생성 (POST /api/testcase/generate)

| 구분 | 내용 |
|------|------|
| **프로젝트 구조** | (선택) 위와 동일한 문서 1개 |
| **역할 지시** | "QA 엔지니어, 시나리오 기반 TC 작성, 비개발자/수동 테스터용" |
| **프로젝트 이름** | 사용자 입력 또는 경로에서 추출 |
| **영향도 분석 결과** | overallRisk, summary, affectedAreas(이름·위험도·설명) |
| **변경 파일 목록** | `경로, 상태` 만 |
| **Diff 본문** | `rawDiff` **최대 10,000자** |
| **작성 규칙** | P1/P2/P3, 실행 단계·예상 결과 형식, 체크리스트 요청 |

**API 파라미터**: `model`, `max_tokens: 4096`, `messages: [{ role: 'user', content: prompt }]`

---

## 3. 한 줄 요약

- **영향도 분석**: (프로젝트 구조) + 변경 파일 목록 + 통계 + **diff 1.5만 자** + JSON 형식 안내  
- **TC 생성**: (프로젝트 구조) + 프로젝트명 + **영향도 분석 결과** + 변경 파일 목록 + **diff 1만 자** + TC 형식 안내  

괄호는 있으면 넣고 없으면 생략. 실제 전송은 모두 **한 덩어리 텍스트(prompt)** 로만 이루어짐.
