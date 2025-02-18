const db = require('./init');

// 将db.all包装为Promise
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 等待一段时间
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 检查表结构
async function checkDatabase() {
  try {
    // 等待数据库初始化完成
    await wait(1000);

    console.log('检查数据库表...');
    const tables = await allAsync("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('数据库中的表:', tables.map(t => t.name));

    if (tables.length === 0) {
      console.log('数据库中没有表，可能初始化尚未完成');
      return;
    }

    // 检查users表的结构
    console.log('\n检查users表结构...');
    const columns = await allAsync("PRAGMA table_info(users)");
    console.log('users表的列:', columns.map(c => ({
      name: c.name,
      type: c.type,
      notnull: c.notnull,
      dflt_value: c.dflt_value
    })));

    // 检查是否有管理员账号
    console.log('\n检查管理员账号...');
    const admins = await allAsync("SELECT * FROM users WHERE role = 'admin'");
    console.log('管理员账号:', admins);

  } catch (error) {
    console.error('检查数据库时出错:', error);
  } finally {
    process.exit(0);
  }
}

// 开始检查
checkDatabase(); 