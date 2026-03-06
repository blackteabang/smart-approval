
export enum ApprovalStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

export type User = {
  id: string;
  name: string;
  position: string;
  department: string;
  phone: string;
  password?: string;
  avatar?: string;
};

export type ApprovalRole = 'APPROVER' | 'AGREEMENT';

export type ApprovalLine = {
  id: string;
  user: User;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  role: ApprovalRole;
  comment?: string;
  processedAt?: string;
};

export type DocumentTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 string
};

export type ApprovalDocument = {
  id: string;
  title: string;
  templateId: string;
  content: string;
  author: User;
  status: ApprovalStatus;
  createdAt: string;
  approvalLine: ApprovalLine[];
  referenceUsers: User[];
  attachments: Attachment[];
};

export type TabType = 'dashboard' | 'draft' | 'documents' | 'staff' | 'chat';

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'system' | 'file' | 'image';
  attachment?: Attachment;
};

export type ChatRoom = {
  id: string;
  name: string; // Group chat name or User name
  participants: User[];
  messages: ChatMessage[];
  relatedDocId?: string; // Optional: Link to a specific document
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
};
