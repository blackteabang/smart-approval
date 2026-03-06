
import { ApprovalStatus, User, DocumentTemplate, ApprovalDocument } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '김철수', position: '과장', department: '기획부', phone: '010-1234-5678', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', name: '박민준', position: '부장', department: '기획부', phone: '010-1111-2222', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', name: '이서윤', position: '이사', department: '기획본부', phone: '010-3333-4444', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u3' },
  { id: 'u4', name: '최재원', position: '상무', department: '경영지원', phone: '010-5555-6666', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u4' },
  { id: 'u5', name: '정다은', position: '팀장', department: '마케팅팀', phone: '010-7777-8888', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u5' },
  { id: 'u6', name: '한지민', position: '대리', department: '인사팀', phone: '010-9999-0000', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u6' },
];

export const TEMPLATES: DocumentTemplate[] = [
  { id: 't1', name: '지출결의서', description: '회사 비용 집행을 위한 결의서', icon: '💰' },
  { id: 't2', name: '휴가신청서', description: '연차, 반차 등 휴가 사용 신청', icon: '🏖️' },
  { id: 't3', name: '출장신청서', description: '국내외 비즈니스 출장 보고 및 신청', icon: '✈️' },
  { id: 't4', name: '품의서', description: '일반적인 업무 진행 승인 요청', icon: '📄' }
];

export const MOCK_DOCUMENTS: ApprovalDocument[] = [
  {
    id: 'doc-101',
    title: '2024년 상반기 마케팅 전략 수립의 건',
    templateId: 't4',
    content: '상반기 신규 서비스 런칭에 따른 통합 마케팅 전략을 보고합니다.',
    author: MOCK_USERS[0],
    status: ApprovalStatus.PENDING,
    createdAt: '2024-05-15T10:30:00Z',
    approvalLine: [
      { id: 'al-1', user: MOCK_USERS[1], status: 'APPROVED', role: 'APPROVER', processedAt: '2024-05-15T14:00:00Z' },
      { id: 'al-2', user: MOCK_USERS[2], status: 'PENDING', role: 'APPROVER' }
    ],
    referenceUsers: [MOCK_USERS[5]],
    attachments: []
  }
];
