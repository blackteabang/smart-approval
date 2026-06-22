import express from 'express';
import cors from 'cors';
import pool, { initializeDatabase } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large base64 attachments

// Helper to structure user
const formatUser = (row, prefix = '') => {
  if (!row[`${prefix}id`]) return null;
  return {
    id: row[`${prefix}id`],
    name: row[`${prefix}name`],
    phone: row[`${prefix}phone`],
    password: row[`${prefix}password`],
    department: row[`${prefix}department`],
    position: row[`${prefix}position`],
    avatar: row[`${prefix}avatar`],
    role: row[`${prefix}role`] || 'USER',
    joinDate: row[`${prefix}join_date`] || null,
    status: row[`${prefix}status`] || 'ACTIVE',
    signature: row[`${prefix}signature`] || null
  };
};

// --- Users (사용자 관리) API ---

// 1. 모든 사용자 조회
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows.map(row => formatUser(row)));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 2. 사용자 저장 (Upsert)
app.post('/api/users', async (req, res) => {
  const user = req.body;
  try {
    await pool.query(
      `INSERT INTO users (id, name, phone, password, department, position, avatar, role, join_date, status, signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         password = VALUES(password),
         department = VALUES(department),
         position = VALUES(position),
         avatar = VALUES(avatar),
         role = VALUES(role),
         join_date = VALUES(join_date),
         status = VALUES(status),
         signature = VALUES(signature)`,
      [user.id, user.name, user.phone, user.password, user.department, user.position, user.avatar || null, user.role || 'USER', user.joinDate || null, user.status || 'ACTIVE', user.signature || null]
    );
    res.json(user);
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 3. 사용자 삭제
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: result.affectedRows > 0 });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// --- Documents (문서 관리) API ---

// 1. 모든 결재 문서 조회 (참조 테이블 조인 포함)
app.get('/api/documents', async (req, res) => {
  try {
    // 1. Fetch documents and authors
    const [docsRows] = await pool.query(`
      SELECT d.*, 
             u.id as auth_id, u.name as auth_name, u.phone as auth_phone, u.password as auth_password,
             u.department as auth_department, u.position as auth_position, u.avatar as auth_avatar, u.role as auth_role
      FROM documents d
      LEFT JOIN users u ON d.author_id = u.id
      ORDER BY d.created_at DESC
    `);

    if (docsRows.length === 0) {
      return res.json([]);
    }

    // 2. Fetch all approval lines and users
    const [lineRows] = await pool.query(`
      SELECT al.*,
             u.id as usr_id, u.name as usr_name, u.phone as usr_phone, u.password as usr_password,
             u.department as usr_department, u.position as usr_position, u.avatar as usr_avatar, u.role as usr_role
      FROM approval_lines al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.document_id, al.step_order ASC
    `);

    // 3. Fetch all references
    const [refRows] = await pool.query(`
      SELECT dr.document_id,
             u.id as usr_id, u.name as usr_name, u.phone as usr_phone, u.password as usr_password,
             u.department as usr_department, u.position as usr_position, u.avatar as usr_avatar, u.role as usr_role
      FROM document_references dr
      LEFT JOIN users u ON dr.user_id = u.id
    `);

    // 4. Fetch all attachments
    const [attRows] = await pool.query('SELECT * FROM attachments');

    // Group approval lines, references, and attachments by document_id
    const linesByDoc = {};
    lineRows.forEach(row => {
      if (!linesByDoc[row.document_id]) {
        linesByDoc[row.document_id] = [];
      }
      linesByDoc[row.document_id].push({
        id: row.id,
        status: row.status,
        role: row.role,
        comment: row.comment || null,
        processedAt: row.processed_at,
        user: formatUser(row, 'usr_')
      });
    });

    const refsByDoc = {};
    refRows.forEach(row => {
      if (!refsByDoc[row.document_id]) {
        refsByDoc[row.document_id] = [];
      }
      const u = formatUser(row, 'usr_');
      if (u) {
        refsByDoc[row.document_id].push(u);
      }
    });

    const attsByDoc = {};
    attRows.forEach(row => {
      if (!attsByDoc[row.document_id]) {
        attsByDoc[row.document_id] = [];
      }
      attsByDoc[row.document_id].push({
        id: row.id,
        name: row.name,
        size: row.size,
        type: row.type,
        data: row.data
      });
    });

    // Reconstruct document objects
    const documents = docsRows.map(doc => {
      return {
        id: doc.id,
        title: doc.title,
        templateId: doc.template_id,
        content: doc.content,
        status: doc.status,
        createdAt: doc.created_at,
        author: formatUser(doc, 'auth_'),
        approvalLine: linesByDoc[doc.id] || [],
        referenceUsers: refsByDoc[doc.id] || [],
        attachments: attsByDoc[doc.id] || []
      };
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 2. 새 결재 문서 생성 (트랜잭션 적용)
app.post('/api/documents', async (req, res) => {
  const doc = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 문서 기본 정보 저장
    await connection.query(
      `INSERT INTO documents (id, title, content, template_id, author_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.title, doc.content, doc.templateId, doc.author.id, doc.status, doc.createdAt ? new Date(doc.createdAt) : new Date()]
    );

    // 2. 결재선 저장
    if (doc.approvalLine && doc.approvalLine.length > 0) {
      for (let i = 0; i < doc.approvalLine.length; i++) {
        const line = doc.approvalLine[i];
        await connection.query(
          `INSERT INTO approval_lines (id, document_id, user_id, status, role, step_order, processed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [line.id, doc.id, line.user.id, line.status, line.role, i, line.processedAt ? new Date(line.processedAt) : null]
        );
      }
    }

    // 3. 참조자 저장
    if (doc.referenceUsers && doc.referenceUsers.length > 0) {
      for (const refUser of doc.referenceUsers) {
        const refId = 'ref_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        await connection.query(
          `INSERT INTO document_references (id, document_id, user_id)
           VALUES (?, ?, ?)`,
          [refId, doc.id, refUser.id]
        );
      }
    }

    // 4. 첨부파일 저장
    if (doc.attachments && doc.attachments.length > 0) {
      for (const att of doc.attachments) {
        await connection.query(
          `INSERT INTO attachments (id, document_id, name, size, type, data)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [att.id, doc.id, att.name, att.size, att.type, att.data]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Document created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

// 3. 문서 상태 및 결재선 상태 업데이트 (트랜잭션 적용)
app.put('/api/documents/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, approvalLine } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 문서 상태 업데이트
    await connection.query(
      'UPDATE documents SET status = ? WHERE id = ?',
      [status, id]
    );

    // 2. 결재선 상태 업데이트
    if (approvalLine && approvalLine.length > 0) {
      for (const line of approvalLine) {
        await connection.query(
          `UPDATE approval_lines 
           SET status = ?, processed_at = ?, role = ?, comment = ? 
           WHERE id = ?`,
          [
            line.status, 
            line.processedAt ? new Date(line.processedAt) : null, 
            line.role, 
            line.comment || null,
            line.id
          ]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Document status updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating document status:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

// --- Chat (채팅 관리) API ---

// 1. 특정 사용자의 모든 채팅방 목록 조회 (참여자 및 메시지 포함)
app.get('/api/chat/rooms/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. 사용자가 속한 채팅방 ID 목록 조회
    const [userRooms] = await pool.query(
      'SELECT room_id FROM chat_participants WHERE user_id = ?',
      [userId]
    );

    if (userRooms.length === 0) {
      return res.json([]);
    }

    const roomIds = userRooms.map(r => r.room_id);

    // 2. 채팅방 상세 정보 조회
    const [rooms] = await pool.query(
      `SELECT * FROM chat_rooms WHERE id IN (?) ORDER BY created_at DESC`,
      [roomIds]
    );

    // 3. 각 채팅방의 참여자 및 메시지 전체 조회
    // 3a. 모든 참여자 조회
    const [participantsRows] = await pool.query(
      `SELECT cp.room_id, u.* 
       FROM chat_participants cp 
       JOIN users u ON cp.user_id = u.id 
       WHERE cp.room_id IN (?)`,
      [roomIds]
    );

    // 3b. 모든 메시지 조회
    const [messagesRows] = await pool.query(
      `SELECT * FROM chat_messages 
       WHERE room_id IN (?) 
       ORDER BY created_at ASC`,
      [roomIds]
    );

    // Group participants and messages by room_id
    const participantsByRoom = {};
    participantsRows.forEach(row => {
      if (!participantsByRoom[row.room_id]) {
        participantsByRoom[row.room_id] = [];
      }
      participantsByRoom[row.room_id].push(formatUser(row));
    });

    const messagesByRoom = {};
    messagesRows.forEach(row => {
      if (!messagesByRoom[row.room_id]) {
        messagesByRoom[row.room_id] = [];
      }
      messagesByRoom[row.room_id].push({
        id: row.id,
        senderId: row.sender_id,
        content: row.content,
        timestamp: row.created_at,
        type: row.msg_type,
        attachment: row.attachment_json ? (typeof row.attachment_json === 'string' ? JSON.parse(row.attachment_json) : row.attachment_json) : undefined
      });
    });

    const chatRooms = rooms.map(room => {
      const msgs = messagesByRoom[room.id] || [];
      const parts = participantsByRoom[room.id] || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

      return {
        id: room.id,
        name: room.name,
        participants: parts,
        messages: msgs,
        relatedDocId: room.related_doc_id || undefined,
        createdAt: room.created_at,
        lastMessage: lastMsg ? lastMsg.content : undefined,
        lastMessageTime: lastMsg ? lastMsg.timestamp : room.created_at,
        unreadCount: 0 // Default to 0 as in existing frontend logic
      };
    });

    res.json(chatRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 2. 채팅방 생성 (참여자 목록 추가 포함, 트랜잭션 적용)
app.post('/api/chat/rooms', async (req, res) => {
  const { id, name, participants, relatedDocId, createdAt } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 채팅방 기본 정보 저장 (존재하지 않으면 생성)
    await connection.query(
      `INSERT INTO chat_rooms (id, name, related_doc_id, created_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), related_doc_id = VALUES(related_doc_id)`,
      [id, name, relatedDocId || null, createdAt ? new Date(createdAt) : new Date()]
    );

    // 2. 참여자 추가
    if (participants && participants.length > 0) {
      for (const p of participants) {
        await connection.query(
          `INSERT IGNORE INTO chat_participants (room_id, user_id, joined_at)
           VALUES (?, ?, ?)`,
          [id, p.id, createdAt ? new Date(createdAt) : new Date()]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Chat room created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

// 3. 채팅 메시지 전송
app.post('/api/chat/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const { id, senderId, content, type, attachment, timestamp } = req.body;

  try {
    const attachmentJson = attachment ? JSON.stringify(attachment) : null;
    await pool.query(
      `INSERT INTO chat_messages (id, room_id, sender_id, content, msg_type, attachment_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, roomId, senderId, content, type, attachmentJson, timestamp ? new Date(timestamp) : new Date()]
    );
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 4. 채팅방 사용자 초대 및 시스템 메시지 추가 (트랜잭션 적용)
app.post('/api/chat/rooms/:roomId/invite', async (req, res) => {
  const { roomId } = req.params;
  const { user, systemMsg } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 참여자 추가
    await connection.query(
      `INSERT IGNORE INTO chat_participants (room_id, user_id)
       VALUES (?, ?)`,
      [roomId, user.id]
    );

    // 2. 초대 시스템 메시지 등록
    if (systemMsg) {
      await connection.query(
        `INSERT INTO chat_messages (id, room_id, sender_id, content, msg_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [systemMsg.id, roomId, 'system', systemMsg.content, 'system', systemMsg.timestamp ? new Date(systemMsg.timestamp) : new Date()]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'User invited and system message added successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error inviting user to chat room:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

// --- Migration API ---
app.post('/api/migrate', async (req, res) => {
  const { users, documents, chats } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Migrate Users
    if (users && users.length > 0) {
      for (const user of users) {
        await connection.query(
          `INSERT INTO users (id, name, phone, password, department, position, avatar, role, join_date, status, signature)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             phone = VALUES(phone),
             password = VALUES(password),
             department = VALUES(department),
             position = VALUES(position),
             avatar = VALUES(avatar),
             role = VALUES(role),
             join_date = VALUES(join_date),
             status = VALUES(status),
             signature = VALUES(signature)`,
          [user.id, user.name, user.phone, user.password, user.department, user.position, user.avatar || null, user.role || 'USER', user.joinDate || null, user.status || 'ACTIVE', user.signature || null]
        );
      }
    }

    // 2. Migrate Documents
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        // Insert doc
        await connection.query(
          `INSERT INTO documents (id, title, content, template_id, author_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             content = VALUES(content),
             template_id = VALUES(template_id),
             author_id = VALUES(author_id),
             status = VALUES(status),
             created_at = VALUES(created_at)`,
          [doc.id, doc.title, doc.content, doc.templateId, doc.author.id, doc.status, doc.createdAt ? new Date(doc.createdAt) : new Date()]
        );

        // Insert approval lines
        if (doc.approvalLine && doc.approvalLine.length > 0) {
          for (let i = 0; i < doc.approvalLine.length; i++) {
            const line = doc.approvalLine[i];
            await connection.query(
              `INSERT INTO approval_lines (id, document_id, user_id, status, role, step_order, processed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 status = VALUES(status),
                 role = VALUES(role),
                 step_order = VALUES(step_order),
                 processed_at = VALUES(processed_at)`,
              [line.id, doc.id, line.user.id, line.status, line.role, i, line.processedAt ? new Date(line.processedAt) : null]
            );
          }
        }

        // Insert reference users
        if (doc.referenceUsers && doc.referenceUsers.length > 0) {
          for (const refUser of doc.referenceUsers) {
            const refId = 'ref_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
            await connection.query(
              `INSERT IGNORE INTO document_references (id, document_id, user_id)
               VALUES (?, ?, ?)`,
              [refId, doc.id, refUser.id]
            );
          }
        }

        // Insert attachments
        if (doc.attachments && doc.attachments.length > 0) {
          for (const att of doc.attachments) {
            await connection.query(
              `INSERT INTO attachments (id, document_id, name, size, type, data)
               VALUES (?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 name = VALUES(name),
                 size = VALUES(size),
                 type = VALUES(type),
                 data = VALUES(data)`,
              [att.id, doc.id, att.name, att.size, att.type, att.data]
            );
          }
        }
      }
    }

    // 3. Migrate Chat Rooms
    if (chats && chats.length > 0) {
      for (const room of chats) {
        await connection.query(
          `INSERT INTO chat_rooms (id, name, related_doc_id, created_at)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             related_doc_id = VALUES(related_doc_id),
             created_at = VALUES(created_at)`,
          [room.id, room.name, room.relatedDocId || null, room.createdAt ? new Date(room.createdAt) : new Date()]
        );

        // Insert participants
        if (room.participants && room.participants.length > 0) {
          for (const p of room.participants) {
            await connection.query(
              `INSERT IGNORE INTO chat_participants (room_id, user_id, joined_at)
               VALUES (?, ?, ?)`,
              [room.id, p.id, room.createdAt ? new Date(room.createdAt) : new Date()]
            );
          }
        }

        // Insert messages
        if (room.messages && room.messages.length > 0) {
          for (const msg of room.messages) {
            const attachmentJson = msg.attachment ? JSON.stringify(msg.attachment) : null;
            await connection.query(
              `INSERT INTO chat_messages (id, room_id, sender_id, content, msg_type, attachment_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 content = VALUES(content),
                 msg_type = VALUES(msg_type),
                 attachment_json = VALUES(attachment_json),
                 created_at = VALUES(created_at)`,
              [msg.id, room.id, msg.senderId === 'system' ? 'system' : msg.senderId, msg.content, msg.type, attachmentJson, msg.timestamp ? new Date(msg.timestamp) : new Date()]
            );
          }
        }
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error);
    res.status(500).json({ error: 'Migration failed', message: error.message });
  } finally {
    connection.release();
  }
});

// Serve static files from the React frontend app
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all handler to serve index.html for any other requests (React Router support)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  await initializeDatabase();
});
