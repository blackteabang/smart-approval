import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, ApprovalDocument, ApprovalStatus, ApprovalLine, Attachment, ChatRoom, ChatMessage } from '../types';
import { MOCK_USERS, MOCK_DOCUMENTS } from '../constants';

// --- Users ---

export const getUsers = async (): Promise<User[]> => {
  if (!isSupabaseConfigured()) {
    const saved = localStorage.getItem('smartapprove_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  }
  
  const { data, error } = await supabase!.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return MOCK_USERS; // Fallback
  }
  return data || [];
};

export const saveUser = async (user: User): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    // LocalStorage handled in App.tsx side-effect, just return user
    return user;
  }

  const { data, error } = await supabase!.from('users').upsert(user).select().single();
  if (error) {
    console.error('Error saving user:', error);
    return null;
  }
  return data;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  
  const { error } = await supabase!.from('users').delete().eq('id', userId);
  return !error;
};

// --- Documents ---

export const getDocuments = async (): Promise<ApprovalDocument[]> => {
  if (!isSupabaseConfigured()) {
    const saved = localStorage.getItem('smartapprove_docs');
    return saved ? JSON.parse(saved) : MOCK_DOCUMENTS;
  }

  // Fetch documents with relations
  // This is a complex query, simplifying for now by fetching main table
  // In a real app, you'd use a join or multiple queries
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

  // Transform data to match ApprovalDocument type
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

export const createDocument = async (doc: ApprovalDocument): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;

  // 1. Insert Document
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

  // 2. Insert Approval Lines
  const lines = doc.approvalLine.map((l, index) => ({
    id: l.id,
    document_id: doc.id,
    user_id: l.user.id,
    status: l.status,
    role: l.role,
    step_order: index
  }));
  await supabase!.from('approval_lines').insert(lines);

  // 3. Insert References
  const refs = doc.referenceUsers.map(u => ({
    document_id: doc.id,
    user_id: u.id
  }));
  if (refs.length > 0) await supabase!.from('document_references').insert(refs);

  // 4. Insert Attachments
  // Note: Storing base64 in DB is not optimal for large files, but consistent with current implementation
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

export const updateDocumentStatus = async (docId: string, status: string, approvalLine: ApprovalLine[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;

  // Update document status
  await supabase!.from('documents').update({ status }).eq('id', docId);

  // Update approval lines
  for (const line of approvalLine) {
    await supabase!.from('approval_lines').update({
      status: line.status,
      processed_at: line.processedAt
    }).eq('id', line.id);
  }

  return true;
};

// --- Chat ---
// Chat implementation would be similar, but for brevity let's stick to LocalStorage if not implemented
// or implement basic structure
