const axios = require('axios')

class MapUtils {
  constructor() {
    this.key = process.env.AMAP_KEY
    this.baseUrl = 'https://restapi.amap.com/v3'
  }

  // 计算两点间距离（米）
  async calculateDistance(origin, destination) {
    try {
      const originStr = Array.isArray(origin) ? origin.join(',') : origin
      const destinationStr = Array.isArray(destination) ? destination.join(',') : destination

      const response = await axios.get(`${this.baseUrl}/distance`, {
        params: {
          key: this.key,
          origins: originStr,
          destination: destinationStr,
          type: 1 // 1：直线距离 2：驾车导航距离
        }
      })

      if (response.data.status === '1' && response.data.results?.length > 0) {
        return parseInt(response.data.results[0].distance)
      }

      throw new Error('距离计算失败')
    } catch (error) {
      console.error('距离计算失败:', error)
      // 如果 API 调用失败，使用直线距离计算
      return this.calculateLinearDistance(origin, destination)
    }
  }

  // 计算直线距离（米）
  calculateLinearDistance(point1, point2) {
    const [lng1, lat1] = Array.isArray(point1) ? point1 : point1.split(',')
    const [lng2, lat2] = Array.isArray(point2) ? point2 : point2.split(',')
    
    const radLat1 = (lat1 * Math.PI) / 180
    const radLat2 = (lat2 * Math.PI) / 180
    const a = radLat1 - radLat2
    const b = (lng1 * Math.PI) / 180 - (lng2 * Math.PI) / 180
    
    const s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + 
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
    
    return Math.round(s * 6378137) // 地球半径：6378137米
  }

  // 获取行驶路线
  async getDrivingRoute(origin, destination, waypoints = []) {
    try {
      const originStr = Array.isArray(origin) ? origin.join(',') : origin
      const destinationStr = Array.isArray(destination) ? destination.join(',') : destination
      const waypointsStr = waypoints
        .map(point => Array.isArray(point) ? point.join(',') : point)
        .join(';')

      const response = await axios.get(`${this.baseUrl}/direction/driving`, {
        params: {
          key: this.key,
          origin: originStr,
          destination: destinationStr,
          waypoints: waypointsStr,
          strategy: 2, // 0-速度优先，1-费用优先，2-距离优先
          extensions: 'all'
        }
      })

      if (response.data.status === '1' && response.data.route?.paths?.length > 0) {
        const path = response.data.route.paths[0]
        return {
          distance: parseInt(path.distance),
          duration: parseInt(path.duration),
          tolls: parseInt(path.tolls || 0),
          steps: path.steps.map(step => ({
            instruction: step.instruction,
            distance: parseInt(step.distance),
            duration: parseInt(step.duration),
            path: step.polyline.split(';').map(point => point.split(','))
          }))
        }
      }

      throw new Error('路线规划失败')
    } catch (error) {
      console.error('路线规划失败:', error)
      throw error
    }
  }

  // 地理编码（地址转坐标）
  async geocode(address) {
    try {
      const response = await axios.get(`${this.baseUrl}/geocode/geo`, {
        params: {
          key: this.key,
          address
        }
      })

      if (response.data.status === '1' && response.data.geocodes?.length > 0) {
        const location = response.data.geocodes[0].location.split(',')
        return {
          location,
          formatted_address: response.data.geocodes[0].formatted_address,
          level: response.data.geocodes[0].level
        }
      }

      throw new Error('地理编码失败')
    } catch (error) {
      console.error('地理编码失败:', error)
      throw error
    }
  }

  // 逆地理编码（坐标转地址）
  async reverseGeocode(location) {
    try {
      const locationStr = Array.isArray(location) ? location.join(',') : location

      const response = await axios.get(`${this.baseUrl}/geocode/regeo`, {
        params: {
          key: this.key,
          location: locationStr
        }
      })

      if (response.data.status === '1' && response.data.regeocode) {
        return {
          address: response.data.regeocode.formatted_address,
          addressComponent: response.data.regeocode.addressComponent
        }
      }

      throw new Error('逆地理编码失败')
    } catch (error) {
      console.error('逆地理编码失败:', error)
      throw error
    }
  }
}

module.exports = new MapUtils() 