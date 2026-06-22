-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- Note: In production, this should be hashed
  department VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  avatar TEXT,
  role VARCHAR(50) DEFAULT 'USER',
  join_date VARCHAR(50) NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  signature TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  template_id VARCHAR(255) NOT NULL,
  author_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Approval Lines Table
CREATE TABLE IF NOT EXISTS approval_lines (
  id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255),
  user_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  role VARCHAR(50) NOT NULL, -- 'APPROVER' or 'AGREEMENT'
  processed_at TIMESTAMP NULL DEFAULT NULL,
  step_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reference Users Table
CREATE TABLE IF NOT EXISTS document_references (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(255),
  user_id VARCHAR(255),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  size INT NOT NULL,
  type VARCHAR(255) NOT NULL,
  data LONGTEXT NOT NULL, -- Base64 string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Chat Rooms Table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  related_doc_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Chat Participants Table
CREATE TABLE IF NOT EXISTS chat_participants (
  room_id VARCHAR(255),
  user_id VARCHAR(255),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(255) PRIMARY KEY,
  room_id VARCHAR(255),
  sender_id VARCHAR(255),
  sender_type VARCHAR(50) DEFAULT 'user',
  content TEXT NOT NULL,
  msg_type VARCHAR(50) NOT NULL DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attachment_json JSON,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
