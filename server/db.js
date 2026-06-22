import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'getapproval',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export async function initializeDatabase() {
  try {
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to MySQL database.');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Robust SQL parser: remove single-line and inline comments, then split by semicolon
      const cleanSql = schemaSql
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('--')) {
            return '';
          }
          const commentIndex = line.indexOf('--');
          if (commentIndex >= 0) {
            return line.substring(0, commentIndex);
          }
          return line;
        })
        .join('\n');

      const statements = cleanSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      console.log('🔄 Initializing database tables...');
      for (const statement of statements) {
        await connection.query(statement);
      }
      console.log('✅ Database tables initialization complete.');
    }
    
    // Auto-seed mock users if table is empty
    const [userCountRows] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (userCountRows[0].count === 0) {
      console.log('🌱 Database is empty. Seeding mock users...');
      const mockUsers = [
        { id: 'u1', name: '김철수', position: '과장', department: '기획부', phone: '010-1234-5678', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u1', role: 'USER' },
        { id: 'u2', name: '박민준', position: '부장', department: '기획부', phone: '010-1111-2222', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u2', role: 'USER' },
        { id: 'u3', name: '이서윤', position: '이사', department: '기획본부', phone: '010-3333-4444', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u3', role: 'USER' },
        { id: 'u4', name: '최재원', position: '상무', department: '경영지원', phone: '010-5555-6666', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u4', role: 'USER' },
        { id: 'u5', name: '정다은', position: '팀장', department: '마케팅팀', phone: '010-7777-8888', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u5', role: 'USER' },
        { id: 'u6', name: '한지민', position: '대리', department: '인사팀', phone: '010-9999-0000', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=u6', role: 'USER' },
        { id: 'admin', name: '관리자', position: '관리자', department: '관리팀', phone: 'admin', password: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff', role: 'ADMIN' },
        { id: 'system', name: '시스템', position: '시스템', department: '시스템', phone: 'system', password: 'system_password', avatar: 'https://ui-avatars.com/api/?name=System&background=E2E8F0&color=475569', role: 'USER' },
      ];

      for (const u of mockUsers) {
        await connection.query(
          `INSERT INTO users (id, name, phone, password, department, position, avatar, role)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.name, u.phone, u.password, u.department, u.position, u.avatar, u.role]
        );
      }
      console.log('✅ Successfully seeded mock users.');
    }
    
    // Ensure 'signature' column exists in 'users' table
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "signature"');
      if (columns.length === 0) {
        console.log('🔄 Adding signature column to users table...');
        await connection.query('ALTER TABLE users ADD COLUMN signature TEXT NULL');
        console.log('✅ Added signature column to users table successfully.');
      }
    } catch (colError) {
      console.error('⚠️ Failed to verify or add signature column:', colError.message);
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect or initialize MySQL database:', error.message);
    console.error('⚠️ Please make sure MySQL is running and your .env configuration is correct.');
  }
}

export default pool;
