const { Package } = require('../models');
const { validatePackage } = require('../utils/validation');

// 创建包裹
exports.createPackage = async (req, res) => {
  try {
    const { error } = validatePackage(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const package = await Package.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json(package);
  } catch (error) {
    console.error('创建包裹失败:', error);
    res.status(500).json({ message: '创建包裹失败' });
  }
};

// 更新包裹
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const package = await Package.findByPk(id);
    
    if (!package) {
      return res.status(404).json({ message: '包裹不存在' });
    }

    if (package.userId !== req.user.id) {
      return res.status(403).json({ message: '无权限修改此包裹' });
    }

    await package.update(req.body);
    res.json(package);
  } catch (error) {
    console.error('更新包裹失败:', error);
    res.status(500).json({ message: '更新包裹失败' });
  }
};

// 删除包裹
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const package = await Package.findByPk(id);
    
    if (!package) {
      return res.status(404).json({ message: '包裹不存在' });
    }

    if (package.userId !== req.user.id) {
      return res.status(403).json({ message: '无权限删除此包裹' });
    }

    await package.destroy();
    res.json({ message: '包裹已删除' });
  } catch (error) {
    console.error('删除包裹失败:', error);
    res.status(500).json({ message: '删除包裹失败' });
  }
};

// 获取包裹列表
exports.getPackages = async (req, res) => {
  try {
    const packages = await Package.findAll({
      where: { userId: req.user.id }
    });
    res.json(packages);
  } catch (error) {
    console.error('获取包裹列表失败:', error);
    res.status(500).json({ message: '获取包裹列表失败' });
  }
};

// 获取包裹详情
exports.getPackageDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const package = await Package.findByPk(id);
    
    if (!package) {
      return res.status(404).json({ message: '包裹不存在' });
    }

    if (package.userId !== req.user.id) {
      return res.status(403).json({ message: '无权限查看此包裹' });
    }

    res.json(package);
  } catch (error) {
    console.error('获取包裹详情失败:', error);
    res.status(500).json({ message: '获取包裹详情失败' });
  }
};

// 获取包裹追踪信息
exports.trackPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const package = await Package.findByPk(id, {
      include: ['trackingRecords']
    });
    
    if (!package) {
      return res.status(404).json({ message: '包裹不存在' });
    }

    res.json(package.trackingRecords);
  } catch (error) {
    console.error('获取包裹追踪信息失败:', error);
    res.status(500).json({ message: '获取包裹追踪信息失败' });
  }
}; 