const express = require('express');
const router = express.Router();
const db = require('../database/init');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { isAuthenticated } = require('../middleware/auth');

// 用户注册
router.post('/register', async (req, res) => {
  const { username, password, userType, email, phone } = req.body;

  // 验证用户类型
  if (!['user', 'driver'].includes(userType)) {
    return res.status(400).json({ error: '无效的用户类型' });
  }

  try {
    // 检查用户名是否已存在
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        console.error('查询用户失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (user) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      // 加密密码
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

      // 创建用户
      db.run(
        'INSERT INTO users (username, password, user_type, email, phone) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, userType, email, phone],
        function(err) {
          if (err) {
            console.error('创建用户失败:', err);
            return res.status(500).json({ error: '创建用户失败' });
          }

          // 如果是司机，创建司机记录
          if (userType === 'driver') {
            db.run(
              'INSERT INTO drivers (user_id) VALUES (?)',
              [this.lastID],
              (err) => {
                if (err) {
                  console.error('创建司机记录失败:', err);
                  return res.status(500).json({ error: '创建司机记录失败' });
                }
                res.status(201).json({ message: '司机注册成功' });
              }
            );
          } else {
            res.status(201).json({ message: '用户注册成功' });
          }
        }
      );
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    db.get(
      'SELECT id, username, user_type, email, phone, status FROM users WHERE username = ?',
      [username],
      (err, user) => {
        if (err) {
          console.error('查询用户失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        if (!user) {
          return res.status(401).json({ error: '用户名或密码错误' });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        const isValidPassword = hashedPassword === user.password;
        
        if (!isValidPassword) {
          return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成 JWT token
        const token = jwt.sign(
          { userId: user.id, userType: user.user_type },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.user_type,
            email: user.email,
            phone: user.phone,
            status: user.status
          }
        });
      }
    );
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取用户信息
router.get('/profile', isAuthenticated, async (req, res) => {
  const userId = req.user.userId; // 从 JWT 中获取

  try {
    db.get(
      'SELECT id, username, user_type, email, phone FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          console.error('获取用户信息失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        if (!user) {
          return res.status(404).json({ error: '用户不存在' });
        }

        res.json(user);
      }
    );
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取用户列表
router.get('/', isAuthenticated, async (req, res) => {
  try {
    db.all('SELECT * FROM users WHERE user_type = "user"', (err, users) => {
      if (err) {
        console.error('获取用户列表失败:', err);
        return res.status(500).json({ error: '获取用户列表失败' });
      }

      res.json(users);
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 获取用户信息
router.get('/info', isAuthenticated, async (req, res) => {
  const userId = req.user.userId;

  try {
    db.get(
      'SELECT id, username, user_type as role, email, phone, status FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          console.error('获取用户信息失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        if (!user) {
          return res.status(404).json({ error: '用户不存在' });
        }

        res.json(user);
      }
    );
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取用户统计数据
router.get('/statistics', isAuthenticated, async (req, res) => {
  const userId = req.user.userId;

  try {
    db.get(
      `SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingShipment,
        COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as inTransit,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as pendingPickup,
        COUNT(CASE WHEN status = 'completed' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 END) as monthlyCompleted
      FROM packages 
      WHERE user_id = ?`,
      [userId],
      (err, stats) => {
        if (err) {
          console.error('获取统计数据失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        res.json(stats);
      }
    );
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 获取用户包裹列表
router.get('/packages', isAuthenticated, async (req, res) => {
  const userId = req.user.userId;
  const { page = 1, limit = 10, tracking_number, status, start_date, end_date } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT p.*, 
        os.name as origin_station_name,
        ds.name as destination_station_name,
        d.name as driver_name,
        d.phone as driver_phone
      FROM packages p
      LEFT JOIN stations os ON p.origin_station_id = os.id
      LEFT JOIN stations ds ON p.destination_station_id = ds.id
      LEFT JOIN drivers d ON p.driver_id = d.id
      WHERE p.user_id = ?`;
    const params = [userId];

    if (tracking_number) {
      query += ' AND p.tracking_number LIKE ?';
      params.push(`%${tracking_number}%`);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (start_date && end_date) {
      query += ' AND DATE(p.created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.all(query, params, (err, packages) => {
      if (err) {
        console.error('获取包裹列表失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM packages p WHERE p.user_id = ?';
      const countParams = [userId];

      if (tracking_number) {
        countQuery += ' AND p.tracking_number LIKE ?';
        countParams.push(`%${tracking_number}%`);
      }

      if (status) {
        countQuery += ' AND p.status = ?';
        countParams.push(status);
      }

      if (start_date && end_date) {
        countQuery += ' AND DATE(p.created_at) BETWEEN DATE(?) AND DATE(?)';
        countParams.push(start_date, end_date);
      }

      db.get(countQuery, countParams, (err, result) => {
        if (err) {
          console.error('获取包裹总数失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        res.json({
          items: packages,
          total: result.total
        });
      });
    });
  } catch (error) {
    console.error('获取包裹列表失败:', error);
    res.status(500).json({ error: '获取包裹列表失败' });
  }
});

// 获取最近包裹
router.get('/packages/recent', isAuthenticated, async (req, res) => {
  const userId = req.user.userId;
  const limit = 5; // 默认获取最近5个包裹

  try {
    db.all(
      `SELECT p.*, 
        os.name as origin_station_name,
        ds.name as destination_station_name
      FROM packages p
      LEFT JOIN stations os ON p.origin_station_id = os.id
      LEFT JOIN stations ds ON p.destination_station_id = ds.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ?`,
      [userId, limit],
      (err, packages) => {
        if (err) {
          console.error('获取最近包裹失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        res.json(packages);
      }
    );
  } catch (error) {
    console.error('获取最近包裹失败:', error);
    res.status(500).json({ error: '获取最近包裹失败' });
  }
});

// 获取包裹详情
router.get('/packages/:id', isAuthenticated, async (req, res) => {
  const userId = req.user.userId;
  const packageId = req.params.id;

  try {
    db.get(
      `SELECT p.*, 
        os.name as origin_station_name,
        ds.name as destination_station_name,
        d.name as driver_name,
        d.phone as driver_phone
      FROM packages p
      LEFT JOIN stations os ON p.origin_station_id = os.id
      LEFT JOIN stations ds ON p.destination_station_id = ds.id
      LEFT JOIN drivers d ON p.driver_id = d.id
      WHERE p.id = ? AND p.user_id = ?`,
      [packageId, userId],
      (err, package) => {
        if (err) {
          console.error('获取包裹详情失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        if (!package) {
          return res.status(404).json({ error: '包裹不存在' });
        }

        res.json(package);
      }
    );
  } catch (error) {
    console.error('获取包裹详情失败:', error);
    res.status(500).json({ error: '获取包裹详情失败' });
  }
});

module.exports = router; 