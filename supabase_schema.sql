
-- 1. Users Table (Stores user information)
-- Using a public table instead of auth.users to keep the phone/password logic consistent with the existing app
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- Note: In production, this should be hashed
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents Table (Stores approval documents)
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY, -- Using the existing 'APP-XXXX' format or UUID
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  template_id TEXT NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Approval Lines Table (Stores who needs to approve what)
CREATE TABLE IF NOT EXISTS public.approval_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  role TEXT NOT NULL, -- 'APPROVER' or 'AGREEMENT'
  processed_at TIMESTAMPTZ,
  step_order INTEGER NOT NULL DEFAULT 0
);

-- 4. Reference Users Table (Stores document references)
CREATE TABLE IF NOT EXISTS public.document_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE
);

-- 5. Attachments Table (Stores file metadata and content)
-- Note: Storing large base64 data in DB is not ideal, but for simplicity we keep it. 
-- Ideally use Supabase Storage.
CREATE TABLE IF NOT EXISTS public.attachments (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL, -- Base64 string
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Chat Rooms
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Chat Participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
  room_id TEXT REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- 8. Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- 'system' handled by app logic or nullable
  sender_type TEXT DEFAULT 'user', -- 'user' or 'system'
  content TEXT NOT NULL,
  msg_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'file', 'system'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  attachment_json JSONB -- Stores attachment metadata if any
);

-- Enable Row Level Security (RLS) - Optional for now to keep it simple, but recommended
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies that allow everything for now (Public access)
-- In a real app, you would restrict this based on auth.uid()
CREATE POLICY "Allow public access to users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow public access to documents" ON public.documents FOR ALL USING (true);
CREATE POLICY "Allow public access to lines" ON public.approval_lines FOR ALL USING (true);
CREATE POLICY "Allow public access to refs" ON public.document_references FOR ALL USING (true);
CREATE POLICY "Allow public access to attachments" ON public.attachments FOR ALL USING (true);
CREATE POLICY "Allow public access to chat_rooms" ON public.chat_rooms FOR ALL USING (true);
CREATE POLICY "Allow public access to chat_participants" ON public.chat_participants FOR ALL USING (true);
CREATE POLICY "Allow public access to chat_messages" ON public.chat_messages FOR ALL USING (true);
