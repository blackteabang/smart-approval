<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 전자결재 (Smart Approval)

## 🏗 개발 환경 및 데이터베이스 분석 (Assessment)
* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (유틸리티 클래스 기반 스타일링)
* **Backend**: Node.js, Express.js (MySQL API 모드 시 사용)
* **Database**: 로컬 스토리지 (기본 데모), MySQL (로컬/클라우드 지원), Supabase 연동 지원
* **Architecture**: 프론트엔드와 백엔드가 분리된 구조로, `concurrently`를 통해 로컬에서 동시 실행 가능

사내 전자결재 + 직원/조직도 + 문서 기반 채팅을 한 화면에서 제공하는 React(Vite) 기반 웹앱입니다.  

설정에 따라 다음과 같이 **3가지 모드**로 유연하게 동작합니다:
1. **로컬 스토리지 모드 (기본 데모)**: 환경변수 설정이 없을 때 브라우저의 LocalStorage를 사용하여 독립적으로 동작합니다.
2. **MySQL API 모드**: 로컬 또는 클라우드 MySQL DB와 Express 백엔드 서버를 연동하여 동작합니다.
3. **Supabase 모드**: Supabase BaaS(Backend-as-a-Service)의 PostgreSQL을 연동하여 서버리스 형태로 동작합니다.

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
- **프론트엔드**: React 19 + TypeScript, Vite, Tailwind CSS (유틸리티 클래스 기반 스타일링), React Icons
- **백엔드 API 서버**: Node.js, Express.js (MySQL API 모드 시 사용)
- **데이터베이스 (선택)**: Supabase (PostgreSQL) 또는 MySQL
- **AI 연동 (선택)**: Gemini API (AI 문서 작성 보조)
- **개발 유틸리티**: concurrently (프론트/백엔드 로컬 서버 동시 실행)

## 실행 방법 (로컬)

### 1) 패키지 설치

프론트엔드 및 백엔드(Express API 서버)의 의존성 패키지를 각각 설치해야 합니다.

```bash
# 프론트엔드 패키지 설치 (프로젝트 루트)
npm install

# 백엔드 패키지 설치 (server 폴더)
npm --prefix server install
```

### 2) 환경변수 설정

#### 프론트엔드 환경변수 설정 (`.env.local` 또는 `.env`)
프로젝트 루트에 `.env.local` (또는 `.env`) 파일을 생성하고 아래 값을 설정합니다.

```env
# (선택) Gemini - AI 문서 작성 보조
VITE_GEMINI_API_KEY=YOUR_GEMINI_KEY

# (선택) Supabase - DB 모드 (VITE_API_MODE가 false이거나 없을 때 동작)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# (선택) MySQL API 모드 활성화 (true 설정 시 백엔드 API 서버를 통해 MySQL과 연동)
VITE_API_MODE=true
VITE_API_URL=http://localhost:5000/api
```

#### 백엔드 API 서버 환경변수 설정 (`server/.env`)
`server/` 폴더 내에 `.env` 파일을 생성하고 MySQL 데이터베이스 연결 설정을 입력합니다.

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=getapproval
```

### 3) 개발 서버 실행

루트 폴더에서 아래 명령을 실행하면 `concurrently` 패키지를 사용하여 **Vite 개발 서버**와 **백엔드 Express API 서버**가 동시에 실행됩니다.

```bash
npm run dev
```

- 프론트엔드 URL: `http://localhost:5173` (기본값)
- 백엔드 API URL: `http://localhost:5000` (기본값)

### 4) 프로덕션 빌드/프리뷰 (프론트엔드 전용)

```bash
npm run build
npm run preview
```

## 데모 계정/데이터

DB 미설정(로컬 모드) 또는 DB에 데모 사용자가 없는 경우, 앱/서버는 `MOCK_USERS`를 기반으로 데모 직원이 사라지지 않도록 복구 로직이 내장되어 있습니다.

- 일반 사용자 기본 비밀번호: `password123`
- 관리자 계정 예시: ID(연락처) `admin` / 비밀번호 `admin`

## 데이터베이스 설정 (선택)

### 1) MySQL 설정 (API 모드)

#### 데이터베이스 생성
MySQL 데이터베이스가 활성화되어 있어야 하며, `server/.env`에 명시한 `DB_NAME`(예: `getapproval`) 데이터베이스를 미리 생성해야 합니다.

```sql
CREATE DATABASE IF NOT EXISTS getapproval;
```

#### 테이블 자동 생성 및 초기 데이터(Seed) 주입
- Express API 서버가 시작할 때 `server/db.js`는 `server/schema.sql` 스키마 파일을 자동으로 읽어 필요한 테이블들을 데이터베이스에 자동 생성(DDL)합니다.
- 또한, `users` 테이블에 데이터가 없는 경우 기본적인 데모 사용자 데이터(`MOCK_USERS` 정보와 동일)를 데이터베이스에 자동으로 삽입(Seed)합니다.

---

### 2) Supabase 설정

#### 테이블 생성
`supabase_schema.sql` 내용을 Supabase SQL Editor에서 실행해 테이블을 생성합니다.

주요 테이블:
- `users`
- `documents`
- `approval_lines`
- `document_references`
- `attachments`

---

### 3) 공통 보안 주의사항

현재 데모 앱 특성상 비밀번호는 평문 저장 로직이 포함되어 있습니다. 실제 운영 환경이나 배포 시에는 반드시 비밀번호 해싱 알고리즘(예: bcrypt 등)과 안전한 인증 솔루션(Supabase Auth, JWT 등)으로 교체해야 합니다.

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
- `services/dbService.ts`: 로컬/Supabase DB/MySQL API 모드 데이터 접근 추상화 및 백업 처리
- `services/supabaseClient.ts`: Supabase 연결 설정
- `services/geminiService.ts`: Gemini 연동(AI 보조)
- `components/*`: 화면 컴포넌트(문서함, 결재 상세, 채팅, 직원, 관리자 등)
- `server/`: Express 백엔드 API 서버 (MySQL 연동)
  - `server/index.js`: API 엔드포인트 및 라우팅 설정
  - `server/db.js`: MySQL 커넥션 풀 초기화 및 테이블/시드 데이터 생성
  - `server/schema.sql`: MySQL 테이블 정의 스키마 파일
