/**
 * 결재 상태 열거형
 */
export enum ApprovalStatus {
  DRAFT = 'DRAFT',        // 임시저장
  PENDING = 'PENDING',    // 결재대기
  APPROVED = 'APPROVED',  // 승인완료
  REJECTED = 'REJECTED',  // 반려
  WITHDRAWN = 'WITHDRAWN' // 회수
}

/**
 * 사용자 정보 타입
 */
export type User = {
  id: string;             // 고유 ID
  name: string;           // 이름
  position: string;       // 직급
  department: string;     // 부서
  phone: string;          // 연락처 (로그인 ID로 사용됨)
  password?: string;      // 비밀번호
  avatar?: string;        // 프로필 이미지 URL
  role: 'ADMIN' | 'USER'; // 권한 (관리자/일반사용자)
};

/**
 * 결재 역할 타입
 */
export type ApprovalRole = 'APPROVER' | 'AGREEMENT'; // 결재자 / 합의자

/**
 * 결재선 정보 타입
 */
export type ApprovalLine = {
  id: string;
  user: User;                                 // 결재 대상자
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; // 결재 상태
  role: ApprovalRole;                         // 결재 역할
  comment?: string;                           // 결재 의견
  processedAt?: string;                       // 처리 일시
};

/**
 * 문서 템플릿 타입
 */
export type DocumentTemplate = {
  id: string;
  name: string;        // 템플릿 이름
  description: string; // 설명
  icon: string;        // 아이콘 (이모지 등)
};

/**
 * 첨부파일 타입
 */
export type Attachment = {
  id: string;
  name: string;   // 파일명
  size: number;   // 파일 크기
  type: string;   // 파일 타입
  data: string;   // Base64 데이터
};

/**
 * 전자결재 문서 타입
 */
export type ApprovalDocument = {
  id: string;
  title: string;                 // 제목
  templateId: string;            // 사용된 템플릿 ID
  content: string;               // 문서 내용
  author: User;                  // 기안자
  status: ApprovalStatus;        // 전체 결재 상태
  createdAt: string;             // 생성 일시
  approvalLine: ApprovalLine[];  // 결재선 구성
  referenceUsers: User[];        // 참조자 목록
  attachments: Attachment[];     // 첨부파일 목록
};

/**
 * 메인 탭 타입
 */
export type TabType = 'dashboard' | 'draft' | 'documents' | 'staff' | 'chat' | 'admin';

/**
 * 채팅 메시지 타입
 */
export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'system' | 'file' | 'image';
  attachment?: Attachment;
};

/**
 * 채팅방 타입
 */
export type ChatRoom = {
  id: string;
  name: string;               // 채팅방 이름 (그룹 채팅 시)
  participants: User[];       // 참여자 목록
  messages: ChatMessage[];    // 메시지 목록
  relatedDocId?: string;      // 관련 결재 문서 ID (옵션)
  createdAt: string;          // 생성 일시
  lastMessage?: string;       // 마지막 메시지 내용
  lastMessageTime?: string;   // 마지막 메시지 시간
  unreadCount: number;        // 읽지 않은 메시지 수
};
