const express = require('express');
const router = express.Router();
const { Route, Driver, Station, Package } = require('../models');

// 获取所有路线
router.get('/', async (req, res) => {
  try {
    const routes = await Route.findAll({
      include: [
        { model: Driver, as: 'driver' },
        { model: Station, as: 'startStation' },
        { model: Station, as: 'endStation' },
        { model: Package, as: 'packages' }
      ]
    });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: '获取路线列表失败' });
  }
});

// 获取单个路线
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Station, as: 'startStation' },
        { model: Station, as: 'endStation' },
        { model: Package, as: 'packages' }
      ]
    });
    if (!route) {
      return res.status(404).json({ error: '路线不存在' });
    }
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: '获取路线信息失败' });
  }
});

// 创建路线
router.post('/', async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (error) {
    res.status(400).json({ error: '创建路线失败' });
  }
});

// 更新路线
router.put('/:id', async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) {
      return res.status(404).json({ error: '路线不存在' });
    }
    await route.update(req.body);
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: '更新路线信息失败' });
  }
});

// 删除路线
router.delete('/:id', async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) {
      return res.status(404).json({ error: '路线不存在' });
    }
    await route.destroy();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: '删除路线失败' });
  }
});

// 分配司机到路线
router.put('/:id/assign-driver', async (req, res) => {
  try {
    const { driver_id } = req.body;
    const route = await Route.findByPk(req.params.id);
    if (!route) {
      return res.status(404).json({ error: '路线不存在' });
    }
    await route.update({ 
      driver_id,
      status: 'in_progress'
    });
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: '分配司机失败' });
  }
});

// 更新路线状态
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const route = await Route.findByPk(req.params.id);
    if (!route) {
      return res.status(404).json({ error: '路线不存在' });
    }
    await route.update({ status });
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: '更新路线状态失败' });
  }
});

// 获取路线的包裹
router.get('/:id/packages', async (req, res) => {
  try {
    const packages = await Package.findAll({
      where: { route_id: req.params.id },
      include: [
        { model: User, as: 'sender' },
        { model: User, as: 'receiver' },
        { model: Station, as: 'currentStation' },
        { model: Route, as: 'route' }
      ]
    });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: '获取路线包裹列表失败' });
  }
});

module.exports = router; 