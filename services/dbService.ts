import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, ApprovalDocument, ApprovalStatus, ApprovalLine, Attachment, ChatRoom, ChatMessage } from '../types';
import { MOCK_USERS, MOCK_DOCUMENTS } from '../constants';

// --- Users (사용자 관리) ---

/**
 * 모든 사용자 목록 조회
 * - Supabase가 설정되어 있지 않으면 로컬 저장소(localStorage)에서 조회합니다.
 * - 데이터가 없거나 일부 데모 사용자가 누락된 경우 자동으로 복구합니다.
 */
export const getUsers = async (): Promise<User[]> => {
  if (!isSupabaseConfigured()) {
    const saved = localStorage.getItem('smartapprove_users');
    let users = saved ? JSON.parse(saved) : [...MOCK_USERS];

    // MOCK_USERS가 존재하는지 확인 (누락 시 복구)
    // 예: 'u1' (김철수) 사용자가 없으면 데모 데이터가 손실된 것으로 간주하고 복구 시도
    const hasMockUser = users.some((u: any) => u.id === 'u1');
    if (!hasMockUser) {
      const existingIds = new Set(users.map((u: any) => u.id));
      const missingMocks = MOCK_USERS.filter(m => !existingIds.has(m.id));
      users = [...users, ...missingMocks];
      
      // 복구된 데이터 저장
      localStorage.setItem('smartapprove_users', JSON.stringify(users));
    }

    // 마이그레이션: 관리자 계정 정보 강제 업데이트 (전화번호 'admin' 보장)
    const adminIndex = users.findIndex((u: any) => u.id === 'admin');
    const mockAdmin = MOCK_USERS.find(u => u.id === 'admin');
    
    if (adminIndex !== -1 && mockAdmin) {
      const currentAdmin = users[adminIndex];
      // 전화번호나 권한이 업데이트되지 않은 경우 강제 업데이트
      if (currentAdmin.phone !== mockAdmin.phone || currentAdmin.role !== 'ADMIN') {
        users[adminIndex] = { ...currentAdmin, ...mockAdmin };
        localStorage.setItem('smartapprove_users', JSON.stringify(users));
      }
    } else if (adminIndex === -1 && mockAdmin) {
      // 관리자 계정이 아예 없으면 추가
      users.push(mockAdmin);
      localStorage.setItem('smartapprove_users', JSON.stringify(users));
    }

    // 마이그레이션: 모든 사용자가 role 속성을 가지도록 보장
    users = users.map((u: any) => ({
      ...u,
      role: u.role || (u.id === 'admin' ? 'ADMIN' : 'USER')
    }));

    return users;
  }
  
  const { data, error } = await supabase!.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return MOCK_USERS; // 에러 발생 시 폴백 데이터 반환
  }
  return data || [];
};

/**
 * 사용자 정보 저장 (생성 및 수정)
 */
export const saveUser = async (user: User): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    const users = await getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    let updatedUsers;
    if (existingIndex >= 0) {
      updatedUsers = [...users];
      updatedUsers[existingIndex] = user;
    } else {
      updatedUsers = [...users, user];
    }
    
    localStorage.setItem('smartapprove_users', JSON.stringify(updatedUsers));
    return user;
  }

  const { data, error } = await supabase!.from('users').upsert(user).select().single();
  if (error) {
    console.error('Error saving user:', error);
    return null;
  }
  return data;
};

/**
 * 사용자 삭제
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const users = await getUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    localStorage.setItem('smartapprove_users', JSON.stringify(updatedUsers));
    return true;
  }
  
  const { error } = await supabase!.from('users').delete().eq('id', userId);
  return !error;
};

/**
 * 데이터를 데모 상태로 초기화 (로컬 저장소 전용)
 */
export const resetToMockData = async (): Promise<void> => {
  if (!isSupabaseConfigured()) {
    localStorage.setItem('smartapprove_users', JSON.stringify(MOCK_USERS));
  }
};

// --- Documents (문서 관리) ---

/**
 * 모든 결재 문서 조회
 */
export const getDocuments = async (): Promise<ApprovalDocument[]> => {
  if (!isSupabaseConfigured()) {
    const saved = localStorage.getItem('smartapprove_docs');
    return saved ? JSON.parse(saved) : MOCK_DOCUMENTS;
  }

  // 문서와 관련된 정보(작성자, 결재선, 참조자, 첨부파일)를 함께 조회
  const { data: docs, error } = await supabase!.from('documents').select(`
    *,
    author:users!author_id(*),
    approvalLine:approval_lines(*, user:users(*)),
    referenceUsers:document_references(user:users(*)),
    attachments:attachments(*)
  `);

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }

  // DB 데이터를 클라이언트 앱 타입(ApprovalDocument)에 맞게 변환
  return docs.map((d: any) => ({
    ...d,
    author: d.author,
    approvalLine: d.approvalLine.map((l: any) => ({
      ...l,
      user: l.user
    })),
    referenceUsers: d.referenceUsers.map((r: any) => r.user),
    attachments: d.attachments
  }));
};

/**
 * 새 문서 생성
 */
export const createDocument = async (doc: ApprovalDocument): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const docs = await getDocuments();
    const updatedDocs = [doc, ...docs];
    localStorage.setItem('smartapprove_docs', JSON.stringify(updatedDocs));
    return true;
  }

  // 1. 문서 기본 정보 저장
  const { error: docError } = await supabase!.from('documents').insert({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    template_id: doc.templateId,
    author_id: doc.author.id,
    status: doc.status,
    created_at: doc.createdAt
  });
  if (docError) return false;

  // 2. 결재선 정보 저장
  const lines = doc.approvalLine.map((l, index) => ({
    id: l.id,
    document_id: doc.id,
    user_id: l.user.id,
    status: l.status,
    role: l.role,
    step_order: index
  }));
  await supabase!.from('approval_lines').insert(lines);

  // 3. 참조자 정보 저장
  const refs = doc.referenceUsers.map(u => ({
    document_id: doc.id,
    user_id: u.id
  }));
  if (refs.length > 0) await supabase!.from('document_references').insert(refs);

  // 4. 첨부파일 정보 저장
  const atts = doc.attachments?.map(a => ({
    id: a.id,
    document_id: doc.id,
    name: a.name,
    size: a.size,
    type: a.type,
    data: a.data
  }));
  if (atts && atts.length > 0) await supabase!.from('attachments').insert(atts);

  return true;
};

/**
 * 문서 상태 및 결재선 업데이트 (승인/반려 처리 시)
 */
export const updateDocumentStatus = async (docId: string, status: string, approvalLine: ApprovalLine[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const docs = await getDocuments();
    const updatedDocs = docs.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: status as ApprovalStatus,
          approvalLine
        };
      }
      return doc;
    });
    localStorage.setItem('smartapprove_docs', JSON.stringify(updatedDocs));
    return true;
  }

  // 문서 상태 업데이트
  await supabase!.from('documents').update({ status }).eq('id', docId);

  // 결재선 상태 업데이트
  for (const line of approvalLine) {
    await supabase!.from('approval_lines').update({
      status: line.status,
      processed_at: line.processedAt
    }).eq('id', line.id);
  }

  return true;
};
