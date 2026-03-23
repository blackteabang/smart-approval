<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 전자결재 (Smart Approval)

사내 전자결재 + 직원/조직도 + 문서 기반 채팅을 한 화면에서 제공하는 React(Vite) 기반 웹앱입니다.  
Supabase 설정이 없으면 **로컬 스토리지(LocalStorage)** 기반 데모 모드로 동작하며, Supabase를 연결하면 DB 기반으로 동작합니다.

## 주요 기능

### 전자결재/문서함
- **문서 작성(기안)**: 템플릿 선택 후 제목/본문 작성, 결재선(결재/합의) 구성, 참조자 지정, 파일 첨부
- **문서함 탭**
  - 결재대기문서함(내가 결재선에 포함된 문서)
  - 기안문서함(내가 작성한 문서)
  - 참조문서함(내가 참조자로 지정된 문서)
  - 회수문서함(기안취소로 회수된 문서)
  - (관리자) 전체 문서 관리
- **결재 처리**
  - 결재선 내 본인 순서에서 승인/반려 처리
  - 반려 사유(코멘트) 입력 지원
- **기안취소(회수)**
  - 본인이 기안한 문서 중 **첫 결재가 시작되기 전**에만 회수 가능
  - 회수된 문서는 기안문서함에서 제외되고 회수문서함으로 이동
- **문서 상태 표시**
  - 진행중 / 승인완료 / 반려 / 회수 상태 뱃지 표시
  - 결재선 진행도(아바타/상태) 표시

### 채팅
- **1:1 채팅 / 그룹 채팅** 생성 및 초대
- **결재 문서 채팅방 자동 생성**
  - 문서 기안(결재요청) 성공 시 `docchat-<문서ID>` 채팅방 자동 생성
  - 참여자: 기안자 + 결재선 전체
  - 채팅방에 “기안이 작성되었습니다” 시스템 메시지 + **문서 링크(딥링크)** 자동 첨부
- **문서 링크로 바로 열기**
  - `/?docId=<문서ID>`로 접속 시 문서 상세가 자동 오픈
- **모바일 대응**
  - 채팅 목록/대화 화면 단일 패널 전환(모바일)
  - 메시지 입력창 하단 고정(모바일/웹)

### 직원/조직도
- 부서별 조직도 트리 + 직원 카드 리스트
- (관리자 또는 본인) 직원 정보 수정 가능
- 프로필 메뉴의 **내 정보 수정** → 직원현황의 내 정보 수정 모달로 연결

### 관리자 기능
- 직원 추가/수정/삭제, 비밀번호 초기화(관리자 기능)

### AI 문서 작성 보조(Gemini)
- 템플릿/키워드 기반 문서 내용 생성(설정된 API Key가 있을 때)

## 기술 스택
- React 19 + TypeScript
- Vite
- Tailwind CSS(유틸리티 클래스 기반 스타일링)
- Supabase(선택)
- Gemini API(선택)

## 실행 방법 (로컬)

### 1) 설치

```bash
npm install
```

### 2) 환경변수 설정(.env.local)

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 값을 설정합니다.

```env
# (선택) Gemini - AI 문서 작성 보조
VITE_GEMINI_API_KEY=YOUR_GEMINI_KEY

# (선택) Supabase - DB 모드
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

- Supabase 환경변수가 없으면 자동으로 **로컬 스토리지 모드**로 동작합니다.
- Gemini 키가 없으면 AI 기능은 안내 메시지를 표시하고 비활성 동작합니다.

### 3) 개발 서버 실행

```bash
npm run dev
```

### 4) 프로덕션 빌드/프리뷰

```bash
npm run build
npm run preview
```

## 데모 계정/데이터

Supabase 미설정(로컬 모드) 또는 Supabase에 데모 사용자가 없는 경우, 앱은 `MOCK_USERS`를 누락분만 자동 병합하여 데모 직원이 사라지지 않도록 구성되어 있습니다.

- 일반 사용자 기본 비밀번호: `password123`
- 관리자 계정 예시: ID(연락처) `admin` / 비밀번호 `admin`

## Supabase 설정(선택)

### 1) 테이블 생성

`supabase_schema.sql` 내용을 Supabase SQL Editor에서 실행해 테이블을 생성합니다.

주요 테이블:
- `users`
- `documents`
- `approval_lines`
- `document_references`
- `attachments`
- (선택) `chat_rooms`, `chat_participants`, `chat_messages`

### 2) 주의사항

- 현재 데모 성격의 앱으로, 비밀번호는 평문 저장 로직이 포함되어 있습니다. 실제 운영 환경에서는 해시/인증(Supabase Auth 등)로 교체가 필요합니다.

## 배포

### GitHub + Vercel(권장)

1. GitHub에 푸시
2. Vercel 프로젝트 생성 후 GitHub 레포 연결
3. Vercel 환경변수에 `.env.local`과 동일한 키를 설정
4. 배포 트리거: main 브랜치 푸시

### Windows 자동 배포 스크립트

레포 루트의 `deploy.bat`를 실행하면 `git add/commit/push`를 한 번에 수행합니다.

```bash
npm run deploy
```

## 프로젝트 구조(요약)

- `App.tsx`: 탭 전환/전역 상태(문서/채팅/사용자) 및 주요 화면 렌더링
- `services/dbService.ts`: 로컬/DB 모드 데이터 접근 추상화
- `services/supabaseClient.ts`: Supabase 연결
- `services/geminiService.ts`: Gemini 연동(AI 보조)
- `components/*`: 화면 컴포넌트(문서함, 결재 상세, 채팅, 직원, 관리자 등)
