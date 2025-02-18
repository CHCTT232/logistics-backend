const axios = require('axios');
const { AMAP_KEY, AMAP_API } = require('../config');
const { Station, Package } = require('../models');

class RouteService {
  constructor() {
    this.apiKey = AMAP_KEY;
    // 设置默认的车辆容量限制
    this.maxVolume = 8000000; // 8立方米 (单位：立方厘米)
    this.maxWeight = 2000;    // 2吨 (单位：千克)
  }

  // 计算两点之间的直线距离
  calculateHaversineDistance(point1, point2) {
    const R = 6371; // 地球半径（公里）
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);
    const deltaLat = this.toRadians(point2.latitude - point1.latitude);
    const deltaLon = this.toRadians(point2.longitude - point1.longitude);

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  async geocode(address) {
    try {
      const response = await axios.get(AMAP_API.GEOCODE, {
        params: {
          key: this.apiKey,
          address
        }
      });

      if (response.data.status === '1' && response.data.geocodes.length > 0) {
        const location = response.data.geocodes[0].location.split(',');
        return {
          latitude: parseFloat(location[1]),
          longitude: parseFloat(location[0]),
          address: response.data.geocodes[0].formatted_address
        };
      }

      throw new Error('地址解析失败');
    } catch (error) {
      console.error('地址解析错误:', error);
      throw error;
    }
  }

  async calculateRoute(origin, destination, waypoints = []) {
    try {
      const maxRetries = 3;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const response = await axios.get(AMAP_API.DRIVING, {
            params: {
              key: this.apiKey,
              origin: `${origin.longitude},${origin.latitude}`,
              destination: `${destination.longitude},${destination.latitude}`,
              waypoints: waypoints.map(point => `${point.longitude},${point.latitude}`).join(';'),
              strategy: 2, // 考虑实时路况
              extensions: 'all'
            }
          });

          if (response.data.status === '1' && response.data.route) {
            const route = response.data.route.paths[0];
            return {
              distance: route.distance / 1000, // 转换为公里
              duration: Math.ceil(route.duration / 60), // 转换为分钟
              tolls: route.tolls || 0,
              tollDistance: route.toll_distance || 0,
              polyline: route.steps.map(step => step.polyline).join(';'),
              steps: route.steps.map(step => ({
                instruction: step.instruction,
                distance: step.distance,
                duration: step.duration,
                polyline: step.polyline
              }))
            };
          }

          throw new Error(response.data.info || '路线规划失败');
        } catch (error) {
          retries++;
          if (retries === maxRetries) {
            throw error;
          }
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    } catch (error) {
      console.error('路线规划错误:', error);
      // 如果高德地图API失败，使用直线距离作为备选方案
      const distance = this.calculateHaversineDistance(origin, destination);
      return {
        distance: distance,
        duration: Math.ceil(distance * 2), // 假设平均速度50km/h
        tolls: 0,
        tollDistance: 0,
        polyline: '',
        steps: [{
          instruction: '直线距离规划',
          distance: distance * 1000,
          duration: distance * 2 * 60,
          polyline: ''
        }]
      };
    }
  }

  async calculateDistance(origins, destinations) {
    try {
      const maxRetries = 3;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const response = await axios.get(AMAP_API.DISTANCE, {
            params: {
              key: this.apiKey,
              origins: origins.map(point => `${point.longitude},${point.latitude}`).join('|'),
              destinations: destinations.map(point => `${point.longitude},${point.latitude}`).join('|'),
              type: 1 // 驾车距离
            }
          });

          if (response.data.status === '1' && response.data.results) {
            return response.data.results.map(result => ({
              distance: result.distance / 1000, // 转换为公里
              duration: Math.ceil(result.duration / 60) // 转换为分钟
            }));
          }

          throw new Error(response.data.info || '距离计算失败');
        } catch (error) {
          retries++;
          if (retries === maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    } catch (error) {
      console.error('距离计算错误:', error);
      // 使用直线距离作为备选方案
      return origins.map((origin, i) => ({
        distance: this.calculateHaversineDistance(origin, destinations[i]),
        duration: Math.ceil(this.calculateHaversineDistance(origin, destinations[i]) * 2)
      }));
    }
  }

  // 使用迪杰斯特拉算法和动态规划优化路线
  async optimizeRoute(packages, driver) {
    try {
      // 1. 获取起点和终点的实际路线
      const directRoute = await this.calculateRoute(driver.location, driver.destination);
      
      if (!packages || packages.length === 0) {
        return {
          message: '没有可用的包裹',
          packages: [],
          route: {
            stations: [driver.location, driver.destination],
            distance: directRoute.distance,
            duration: directRoute.duration,
            polyline: directRoute.polyline,
            steps: directRoute.steps,
            estimatedEarnings: this.calculateEstimatedEarnings(directRoute.distance)
          }
        };
      }

      // 2. 过滤出符合车辆容量的包裹
      const validPackages = packages.filter(pkg => {
        const length = pkg.length || 0;
        const width = pkg.width || 0;
        const height = pkg.height || 0;
        const weight = pkg.weight || 0;
        
        const totalVolume = length * width * height;
        return (totalVolume <= this.maxVolume) && (weight <= this.maxWeight);
      });

      if (validPackages.length === 0) {
        return {
          message: '没有符合车辆容量的包裹',
          packages: [],
          route: {
            stations: [driver.location, driver.destination],
            distance: directRoute.distance,
            duration: directRoute.duration,
            polyline: directRoute.polyline,
            steps: directRoute.steps,
            estimatedEarnings: this.calculateEstimatedEarnings(directRoute.distance)
          }
        };
      }

      // 3. 构建站点列表
      const stations = [driver.location];
      validPackages.forEach(pkg => {
        if (pkg.currentStation) stations.push(pkg.currentStation);
        if (pkg.destination_station) stations.push(pkg.destination_station);
      });
      stations.push(driver.destination);

      // 4. 使用高德地图API计算实际路线
      const routeDetails = await this.calculateRoute(
        stations[0],
        stations[stations.length - 1],
        stations.slice(1, -1)
      );

      return {
        message: '路线规划成功',
        packages: validPackages,
        route: {
          stations,
          distance: routeDetails.distance,
          duration: routeDetails.duration,
          polyline: routeDetails.polyline,
          steps: routeDetails.steps,
          estimatedEarnings: this.calculateEstimatedEarnings(routeDetails.distance)
        }
      };
    } catch (error) {
      console.error('路线优化失败:', error);
      throw new Error('路线优化失败: ' + error.message);
    }
  }

  async buildDistanceMatrix(stations) {
    const matrix = [];
    for (let i = 0; i < stations.length; i++) {
      const row = [];
      for (let j = 0; j < stations.length; j++) {
        if (i === j) {
          row.push(0);
        } else {
          const distance = await this.calculateDistance(
            [stations[i]],
            [stations[j]]
          );
          row.push(distance[0].distance);
        }
      }
      matrix.push(row);
    }
    return matrix;
  }

  // 使用动态规划解决TSP问题
  solveTSP(distanceMatrix, n) {
    const INF = Number.MAX_SAFE_INTEGER;
    const dp = Array(1 << n).fill().map(() => Array(n).fill(INF));
    const parent = Array(1 << n).fill().map(() => Array(n).fill(-1));
    
    // 初始状态
    dp[1][0] = 0;
    
    // 遍历所有状态
    for (let mask = 1; mask < (1 << n); mask++) {
      for (let u = 0; u < n; u++) {
        if ((mask & (1 << u)) === 0) continue;
        
        for (let v = 0; v < n; v++) {
          if ((mask & (1 << v)) !== 0) continue;
          
          const newMask = mask | (1 << v);
          const cost = dp[mask][u] + distanceMatrix[u][v];
          
          if (cost < dp[newMask][v]) {
            dp[newMask][v] = cost;
            parent[newMask][v] = u;
          }
        }
      }
    }
    
    // 重建路径
    const path = [];
    let mask = (1 << n) - 1;
    let pos = 0;
    
    while (mask !== 0) {
      path.push(pos);
      const p = parent[mask][pos];
      if (p === -1) break;
      
      mask ^= (1 << pos);
      pos = p;
    }
    
    return {
      path: path.reverse(),
      distance: dp[(1 << n) - 1][0]
    };
  }

  calculateEstimatedEarnings(distance) {
    // 基础运费：50公里6元
    const baseRate = 6 / 50; // 每公里基础运费
    return Math.round(distance * baseRate * 100) / 100; // 保留两位小数
  }

  // 使用高德地图API获取实际驾车路径
  async getAMapDrivingRoute(origin, destination) {
    try {
      const response = await axios.get('https://restapi.amap.com/v3/direction/driving', {
        params: {
          key: this.apiKey,
          origin: `${origin.longitude},${origin.latitude}`,
          destination: `${destination.longitude},${destination.latitude}`,
          extensions: 'all'
        }
      });

      if (response.data.status === '1') {
        const route = response.data.route;
        return {
          distance: parseFloat(route.paths[0].distance) / 1000, // 转换为公里
          duration: parseInt(route.paths[0].duration) / 60, // 转换为分钟
          steps: route.paths[0].steps,
          polyline: route.paths[0].polyline
        };
      } else {
        throw new Error('获取路径失败');
      }
    } catch (error) {
      console.error('获取高德地图路径失败:', error);
      throw error;
    }
  }

  // 根据包裹体积和重量对站点进行分组
  groupStationsByCapacity(stations, packages) {
    // 按照包裹的起始站点和目的站点进行分组
    const packageGroups = this.groupPackagesByStations(packages);
    
    // 对每组包裹计算总体积和重量
    const stationGroups = [];
    let currentGroup = {
      stations: [stations[0]], // 起始点（司机当前位置）
      packages: [],
      totalVolume: 0,
      totalWeight: 0
    };

    for (const group of packageGroups) {
      const groupVolume = group.packages.reduce((sum, pkg) => sum + pkg.volume, 0);
      const groupWeight = group.packages.reduce((sum, pkg) => sum + pkg.weight, 0);

      // 检查是否超过车辆容量限制
      if (currentGroup.totalVolume + groupVolume <= this.maxVolume &&
          currentGroup.totalWeight + groupWeight <= this.maxWeight) {
        // 添加取件站点
        if (!currentGroup.stations.find(s => s.id === group.fromStation.id)) {
          currentGroup.stations.push(group.fromStation);
        }
        // 添加派送站点
        if (!currentGroup.stations.find(s => s.id === group.toStation.id)) {
          currentGroup.stations.push(group.toStation);
        }
        // 添加包裹
        currentGroup.packages.push(...group.packages);
        currentGroup.totalVolume += groupVolume;
        currentGroup.totalWeight += groupWeight;
      } else {
        // 当前组已满，创建新组
        if (currentGroup.stations.length > 1) {
          stationGroups.push(currentGroup.stations);
        }
        currentGroup = {
          stations: [
            stations[0], // 起始点
            group.fromStation,
            group.toStation
          ],
          packages: [...group.packages],
          totalVolume: groupVolume,
          totalWeight: groupWeight
        };
      }
    }

    // 添加最后一组
    if (currentGroup.stations.length > 1) {
      stationGroups.push(currentGroup.stations);
    }

    return stationGroups;
  }

  // 按照包裹的起始站点和目的站点进行分组
  groupPackagesByStations(packages) {
    const groups = [];
    const groupMap = new Map();

    for (const pkg of packages) {
      const key = `${pkg.from_station_id}-${pkg.to_station_id}`;
      if (!groupMap.has(key)) {
        const group = {
          fromStation: {
            id: pkg.from_station_id,
            name: pkg.from_station_name,
            longitude: pkg.from_longitude,
            latitude: pkg.from_latitude
          },
          toStation: {
            id: pkg.to_station_id,
            name: pkg.to_station_name,
            longitude: pkg.to_longitude,
            latitude: pkg.to_latitude
          },
          packages: []
        };
        groups.push(group);
        groupMap.set(key, group);
      }
      groupMap.get(key).packages.push(pkg);
    }

    // 按包裹数量排序，优先处理包裹多的路线
    return groups.sort((a, b) => b.packages.length - a.packages.length);
  }

  // 计算路线的时间窗口约束
  calculateTimeWindows(route) {
    const timeWindows = [];
    let currentTime = new Date();
    
    for (let i = 0; i < route.stations.length - 1; i++) {
      const origin = route.stations[i];
      const destination = route.stations[i + 1];
      const segment = route.detailedRoute[i];
      
      // 考虑路段行驶时间
      const travelTime = segment.duration; // 分钟
      
      // 考虑装卸货时间（估计值：每个包裹5分钟）
      const loadingTime = 5 * route.packages.filter(pkg => 
        pkg.from_station_id === origin.id || 
        pkg.to_station_id === destination.id
      ).length;
      
      // 计算到达时间窗口
      const arrivalTime = new Date(currentTime.getTime() + travelTime * 60000);
      const departureTime = new Date(arrivalTime.getTime() + loadingTime * 60000);
      
      timeWindows.push({
        stationId: destination.id,
        earliestArrival: arrivalTime,
        latestArrival: new Date(arrivalTime.getTime() + 30 * 60000), // 30分钟缓冲
        estimatedDeparture: departureTime
      });
      
      currentTime = departureTime;
    }
    
    return timeWindows;
  }

  // 获取多站点最优配送路径
  async getOptimalDeliveryRoute(stations, packages) {
    try {
      // 1. 根据包裹体积和重量对站点进行分组
      const groupedStations = this.groupStationsByCapacity(stations, packages);
      
      // 2. 对每组使用动态规划计算最优路径
      const routes = [];
      for (const group of groupedStations) {
        const optimalRoute = this.calculateOptimalRoute(group);
        
        // 3. 使用高德地图API获取实际驾车路径
        const detailedRoute = [];
        for (let i = 0; i < optimalRoute.path.length - 1; i++) {
          const origin = optimalRoute.path[i];
          const destination = optimalRoute.path[i + 1];
          const drivingRoute = await this.getAMapDrivingRoute(origin, destination);
          detailedRoute.push(drivingRoute);
        }
        
        // 4. 计算时间窗口约束
        const timeWindows = this.calculateTimeWindows({
          stations: optimalRoute.path,
          detailedRoute,
          packages: packages.filter(pkg => 
            optimalRoute.path.some(station => 
              station.id === pkg.from_station_id || 
              station.id === pkg.to_station_id
            )
          )
        });
        
        routes.push({
          stations: optimalRoute.path,
          distance: optimalRoute.distance,
          detailedRoute,
          timeWindows,
          packages: packages.filter(pkg => 
            optimalRoute.path.some(station => 
              station.id === pkg.from_station_id || 
              station.id === pkg.to_station_id
            )
          )
        });
      }
      
      return routes;
    } catch (error) {
      console.error('获取最优配送路径失败:', error);
      throw error;
    }
  }

  // 使用迪杰斯特拉算法计算最短路径
  async calculateShortestPath(startStationId, endStationId) {
    try {
      // 获取所有站点
      const stations = await Station.findAll({
        attributes: ['id', 'name', 'latitude', 'longitude']
      });

      // 构建邻接矩阵
      const graph = this.buildGraph(stations);

      // 使用迪杰斯特拉算法计算最短路径
      const { distances, previous } = this.dijkstra(graph, startStationId);

      // 重建路径
      const path = this.reconstructPath(previous, startStationId, endStationId);

      // 获取路径上的站点信息
      const pathStations = await Promise.all(
        path.map(async (stationId) => {
          const station = stations.find(s => s.id === stationId);
          const packages = await Package.count({
            where: {
              origin_station_id: stationId,
              status: 'pending'
            }
          });
          return {
            id: station.id,
            name: station.name,
            latitude: station.latitude,
            longitude: station.longitude,
            packages
          };
        })
      );

      // 计算总距离和预计时间
      const totalDistance = this.calculateTotalDistance(pathStations);
      const estimatedDuration = this.calculateEstimatedDuration(totalDistance);
      const estimatedIncome = this.calculateEstimatedIncome(totalDistance);

      return {
        path: pathStations,
        distance: Math.round(totalDistance),
        duration: Math.round(estimatedDuration),
        income: Math.round(estimatedIncome)
      };
    } catch (error) {
      console.error('计算最短路径失败:', error);
      throw error;
    }
  }

  // 构建邻接矩阵
  buildGraph(stations) {
    const graph = {};
    
    stations.forEach(station => {
      graph[station.id] = {};
      stations.forEach(otherStation => {
        if (station.id !== otherStation.id) {
          const distance = this.calculateDistance(
            station.latitude,
            station.longitude,
            otherStation.latitude,
            otherStation.longitude
          );
          graph[station.id][otherStation.id] = distance[0].distance;
        }
      });
    });

    return graph;
  }

  // 迪杰斯特拉算法
  dijkstra(graph, startNode) {
    const distances = {};
    const previous = {};
    const nodes = new Set();

    // 初始化
    Object.keys(graph).forEach(node => {
      distances[node] = Infinity;
      previous[node] = null;
      nodes.add(node);
    });
    distances[startNode] = 0;

    while (nodes.size > 0) {
      // 找到距离最短的节点
      let minNode = null;
      let minDistance = Infinity;
      nodes.forEach(node => {
        if (distances[node] < minDistance) {
          minNode = node;
          minDistance = distances[node];
        }
      });

      if (minNode === null) break;

      nodes.delete(minNode);

      // 更新相邻节点的距离
      Object.keys(graph[minNode]).forEach(neighbor => {
        if (nodes.has(neighbor)) {
          const alt = distances[minNode] + graph[minNode][neighbor];
          if (alt < distances[neighbor]) {
            distances[neighbor] = alt;
            previous[neighbor] = minNode;
          }
        }
      });
    }

    return { distances, previous };
  }

  // 重建路径
  reconstructPath(previous, startNode, endNode) {
    const path = [];
    let currentNode = endNode;

    while (currentNode !== null) {
      path.unshift(parseInt(currentNode));
      currentNode = previous[currentNode];
    }

    return path;
  }

  // 计算两点之间的距离（使用Haversine公式）
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // 角度转弧度
  toRad(value) {
    return value * Math.PI / 180;
  }

  // 计算路径总距离
  calculateTotalDistance(stations) {
    let totalDistance = 0;
    for (let i = 0; i < stations.length - 1; i++) {
      totalDistance += this.calculateDistance(
        stations[i].latitude,
        stations[i].longitude,
        stations[i + 1].latitude,
        stations[i + 1].longitude
      );
    }
    return totalDistance;
  }

  // 计算预计时间（分钟）
  calculateEstimatedDuration(distance) {
    // 假设平均速度为50公里/小时
    return (distance / 50) * 60;
  }

  // 计算预计收入
  calculateEstimatedIncome(distance) {
    // 基础运费：6元/50公里
    return (distance / 50) * 6;
  }
}

module.exports = new RouteService(); 