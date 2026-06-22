const mysql = require('./node_modules/mysql2');

const passwords = ['', 'root', '1234', '123456', 'root1234', 'mysql', 'admin', '1111', '111111'];

async function test() {
  for (const pw of passwords) {
    console.log(`Testing password: "${pw}"`);
    try {
      const connection = mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: pw
      });
      
      await new Promise((resolve, reject) => {
        connection.connect((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log(`✅ Success! Password is "${pw}"`);
      connection.end();
      return;
    } catch (err) {
      console.log(`❌ Failed for "${pw}": ${err.message}`);
    }
  }
  console.log("None of the common passwords worked.");
}

test();
