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
  // 로컬 스토리지에서 데이터를 가져오는 헬퍼 함수
  const getLocalUsers = () => {
    const saved = localStorage.getItem('smartapprove_users');
    let users = saved ? JSON.parse(saved) : [...MOCK_USERS];

    // 데이터 복구 로직: 로컬 스토리지가 비어있거나 MOCK_USERS가 누락된 경우에만 실행
    // 단, 사용자가 의도적으로 MOCK_USERS를 삭제했을 수도 있으므로
    // '데이터가 거의 없는 경우(1명 이하)'에만 복구하도록 제한
    const shouldRestoreMocks = users.length <= 1 || !users.some((u: any) => u.id === 'u1');
    if (shouldRestoreMocks) {
      const existingIds = new Set(users.map((u: any) => u.id));
      const missingMocks = MOCK_USERS.filter(m => !existingIds.has(m.id));
      users = [...users, ...missingMocks];
      localStorage.setItem('smartapprove_users', JSON.stringify(users));
    }
    
    return users.map((u: any) => ({
      ...u,
      role: u.role || (u.id === 'admin' ? 'ADMIN' : 'USER')
    }));
  };

  if (!isSupabaseConfigured()) {
    return getLocalUsers();
  }
  
  const { data, error } = await supabase!.from('users').select('*');
  if (error) {
    console.error('Error fetching users from Supabase, falling back to local storage:', error);
    return getLocalUsers();
  }
  return data || [];
};

/**
 * 사용자 정보 저장 (생성 및 수정)
 */
export const saveUser = async (user: User): Promise<User | null> => {
  // 로컬 스토리지에 저장하는 헬퍼 함수
  const saveLocalUser = async (userToSave: User) => {
    const users = await getUsers(); // 이 시점에서는 로컬/DB 상관없이 가져옴 (에러 시 로컬)
    
    // 만약 getUsers가 DB에서 가져왔다면 로컬엔 없을 수 있음. 
    // 하지만 여기선 '저장 실패 시 로컬로 fallback' 하는 상황이므로
    // 로컬 스토리지 기준으로 병합해야 함.
    // 따라서 로컬 스토리지 직접 조회 필요
    const saved = localStorage.getItem('smartapprove_users');
    let localUsers = saved ? JSON.parse(saved) : [...MOCK_USERS];
    
    const existingIndex = localUsers.findIndex((u: any) => u.id === userToSave.id);
    if (existingIndex >= 0) {
      localUsers[existingIndex] = userToSave;
    } else {
      localUsers.push(userToSave);
    }
    localStorage.setItem('smartapprove_users', JSON.stringify(localUsers));
    return userToSave;
  };

  if (!isSupabaseConfigured()) {
    return saveLocalUser(user);
  }

  const { data, error } = await supabase!.from('users').upsert(user).select().single();
  if (error) {
    console.error('Error saving user to Supabase, falling back to local storage:', error);
    // Supabase 저장 실패 시 로컬 스토리지에 저장하여 데이터 유실 방지
    // 이 경우, 나중에 다시 접속했을 때 로컬 스토리지의 데이터를 사용하게 됨
    return saveLocalUser(user);
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
    // Supabase 조회 실패 시 로컬 스토리지 데이터 반환 (백업 데이터)
    const saved = localStorage.getItem('smartapprove_docs');
    return saved ? JSON.parse(saved) : MOCK_DOCUMENTS;
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
  // 로컬 저장소 저장 헬퍼 함수
  const saveLocalDocument = async (docToSave: ApprovalDocument) => {
    // 로컬 모드에서는 getDocuments가 로컬 스토리지를 읽으므로 바로 사용 가능
    // 하지만 DB 모드에서 실패해서 여기로 온 경우, getDocuments는 DB 조회를 시도할 수 있음.
    // 따라서 직접 로컬 스토리지 접근이 안전함.
    const saved = localStorage.getItem('smartapprove_docs');
    const docs = saved ? JSON.parse(saved) : MOCK_DOCUMENTS;
    const updatedDocs = [docToSave, ...docs];
    localStorage.setItem('smartapprove_docs', JSON.stringify(updatedDocs));
    return true;
  };

  if (!isSupabaseConfigured()) {
    return saveLocalDocument(doc);
  }

  try {
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
    
    if (docError) {
      console.error('Error creating document in Supabase:', docError);
      throw docError;
    }

    // 2. 결재선 정보 저장
    const lines = doc.approvalLine.map((l, index) => ({
      id: l.id,
      document_id: doc.id,
      user_id: l.user.id,
      status: l.status,
      role: l.role,
      step_order: index
    }));
    const { error: lineError } = await supabase!.from('approval_lines').insert(lines);
    if (lineError) throw lineError;

    // 3. 참조자 정보 저장
    if (doc.referenceUsers.length > 0) {
      const refs = doc.referenceUsers.map(u => ({
        document_id: doc.id,
        user_id: u.id
      }));
      const { error: refError } = await supabase!.from('document_references').insert(refs);
      if (refError) throw refError;
    }

    // 4. 첨부파일 정보 저장
    if (doc.attachments && doc.attachments.length > 0) {
      const atts = doc.attachments.map(a => ({
        id: a.id,
        document_id: doc.id,
        name: a.name,
        size: a.size,
        type: a.type,
        data: a.data
      }));
      const { error: attError } = await supabase!.from('attachments').insert(atts);
      if (attError) throw attError;
    }

    return true;
  } catch (error) {
    console.error('Failed to create document in Supabase, falling back to local storage:', error);
    // DB 저장 실패 시 로컬 스토리지에 저장 (데이터 유실 방지)
    return saveLocalDocument(doc);
  }
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
    // role 필드가 누락되지 않도록 업데이트 시 주의
    await supabase!.from('approval_lines').update({
      status: line.status,
      processed_at: line.processedAt,
      role: line.role // role 필드 명시적 업데이트 (필수는 아니지만 안전장치)
    }).eq('id', line.id);
  }

  return true;
};
