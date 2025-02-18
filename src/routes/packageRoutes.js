const express = require('express');
const router = express.Router();
const { Package, User, Station, Route } = require('../models');

// 获取所有包裹
router.get('/', async (req, res) => {
  try {
    const packages = await Package.findAll({
      include: [
        { model: User, as: 'sender' },
        { model: User, as: 'receiver' },
        { model: Station, as: 'currentStation' },
        { model: Route, as: 'route' }
      ]
    });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: '获取包裹列表失败' });
  }
});

// 获取单个包裹
router.get('/:id', async (req, res) => {
  try {
    const package = await Package.findByPk(req.params.id, {
      include: [
        { model: User, as: 'sender' },
        { model: User, as: 'receiver' },
        { model: Station, as: 'currentStation' },
        { model: Station, as: 'origin_station' },
        { model: Station, as: 'destination_station' },
        { model: Route, as: 'route' }
      ]
    });
    if (!package) {
      return res.status(404).json({ error: '包裹不存在' });
    }
    res.json(package);
  } catch (error) {
    res.status(500).json({ error: '获取包裹信息失败' });
  }
});

// 创建包裹
router.post('/', async (req, res) => {
  try {
    const package = await Package.create(req.body);
    res.status(201).json(package);
  } catch (error) {
    res.status(400).json({ error: '创建包裹失败' });
  }
});

// 更新包裹
router.put('/:id', async (req, res) => {
  try {
    const package = await Package.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ error: '包裹不存在' });
    }
    await package.update(req.body);
    res.json(package);
  } catch (error) {
    res.status(400).json({ error: '更新包裹信息失败' });
  }
});

// 删除包裹
router.delete('/:id', async (req, res) => {
  try {
    const package = await Package.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ error: '包裹不存在' });
    }
    await package.destroy();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: '删除包裹失败' });
  }
});

// 更新包裹状态
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const package = await Package.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ error: '包裹不存在' });
    }
    await package.update({ status });
    res.json(package);
  } catch (error) {
    res.status(400).json({ error: '更新包裹状态失败' });
  }
});

// 分配包裹到路线
router.put('/:id/assign-route', async (req, res) => {
  try {
    const { route_id } = req.body;
    const package = await Package.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ error: '包裹不存在' });
    }
    await package.update({ 
      route_id,
      status: 'in_transit'
    });
    res.json(package);
  } catch (error) {
    res.status(400).json({ error: '分配路线失败' });
  }
});

// 更新包裹位置
router.put('/:id/location', async (req, res) => {
  try {
    const { current_station_id } = req.body;
    const package = await Package.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ error: '包裹不存在' });
    }
    await package.update({ current_station_id });
    res.json(package);
  } catch (error) {
    res.status(400).json({ error: '更新包裹位置失败' });
  }
});

module.exports = router; 