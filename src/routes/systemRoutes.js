const express = require('express');
const router = express.Router();
const { SystemSetting, User } = require('../models');

// 获取所有系统设置
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({
      include: [
        { model: User, as: 'modifier' }
      ]
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: '获取系统设置列表失败' });
  }
});

// 获取单个系统设置
router.get('/:key', async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({
      where: { key: req.params.key },
      include: [
        { model: User, as: 'modifier' }
      ]
    });
    if (!setting) {
      return res.status(404).json({ error: '系统设置不存在' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: '获取系统设置信息失败' });
  }
});

// 创建系统设置
router.post('/', async (req, res) => {
  try {
    const setting = await SystemSetting.create(req.body);
    res.status(201).json(setting);
  } catch (error) {
    res.status(400).json({ error: '创建系统设置失败' });
  }
});

// 更新系统设置
router.put('/:key', async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({
      where: { key: req.params.key }
    });
    if (!setting) {
      return res.status(404).json({ error: '系统设置不存在' });
    }
    await setting.update(req.body);
    res.json(setting);
  } catch (error) {
    res.status(400).json({ error: '更新系统设置失败' });
  }
});

// 删除系统设置
router.delete('/:key', async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({
      where: { key: req.params.key }
    });
    if (!setting) {
      return res.status(404).json({ error: '系统设置不存在' });
    }
    await setting.destroy();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: '删除系统设置失败' });
  }
});

// 批量更新系统设置
router.put('/', async (req, res) => {
  try {
    const settings = req.body;
    const results = await Promise.all(
      settings.map(async (setting) => {
        const [instance] = await SystemSetting.findOrCreate({
          where: { key: setting.key },
          defaults: setting
        });
        if (instance) {
          await instance.update(setting);
        }
        return instance;
      })
    );
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: '批量更新系统设置失败' });
  }
});

module.exports = router; 