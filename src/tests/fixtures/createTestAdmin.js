const { User } = require('../../models');
const bcrypt = require('bcryptjs');

async function createTestAdmin() {
    try {
        console.log('开始创建测试管理员...');

        // 删除已存在的管理员账号
        await User.destroy({
            where: {
                role: 'admin'
            }
        });
        console.log('已删除现有管理员账号');

        // 使用bcrypt加密密码
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('密码已加密');

        // 创建新管理员
        const admin = await User.create({
            username: 'admin',
            password: hashedPassword,
            email: 'admin@example.com',
            role: 'admin',
            phone: '13800138000',
            status: 'active'
        });

        console.log('测试管理员创建成功:', {
            id: admin.id,
            username: admin.username,
            role: admin.role
        });
        
        console.log('\n=== 管理员账号信息 ===');
        console.log('用户名: admin');
        console.log('密码: admin123');
        console.log('=====================\n');

    } catch (error) {
        console.error('创建测试管理员失败:', error);
    }
}

// 确保数据库连接成功后再执行
const db = require('../../models');
db.sequelize
    .authenticate()
    .then(() => {
        console.log('数据库连接成功');
        createTestAdmin();
    })
    .catch(err => {
        console.error('数据库连接失败:', err);
        process.exit(1);
    }); 