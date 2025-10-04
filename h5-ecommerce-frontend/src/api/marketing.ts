import request from '@/utils/request'

// 秒杀API
export const seckillApi = {
  // 获取秒杀活动列表
  getList(params?: any) {
    return request({
      url: '/api/seckill/list',
      method: 'get',
      params
    })
  },

  // 获取秒杀详情
  getDetail(id: number) {
    return request({
      url: `/api/seckill/${id}`,
      method: 'get'
    })
  },

  // 参与秒杀
  participate(id: number, data: any) {
    return request({
      url: `/api/seckill/${id}/participate`,
      method: 'post',
      data
    })
  }
}

// 拼团API
export const groupBuyApi = {
  // 获取拼团活动列表
  getList(params?: any) {
    return request({
      url: '/api/group-buy/list',
      method: 'get',
      params
    })
  },

  // 获取拼团详情
  getDetail(id: number) {
    return request({
      url: `/api/group-buy/${id}`,
      method: 'get'
    })
  },

  // 开团
  startGroup(id: number, data: any) {
    return request({
      url: `/api/group-buy/${id}/start`,
      method: 'post',
      data
    })
  },

  // 参团
  joinGroup(groupId: number, data: any) {
    return request({
      url: `/api/group-buy/group/${groupId}/join`,
      method: 'post',
      data
    })
  },

  // 获取拼团详情
  getGroupDetail(groupId: number) {
    return request({
      url: `/api/group-buy/group/${groupId}`,
      method: 'get'
    })
  }
}

// 砍价API
export const bargainApi = {
  // 获取砍价活动列表
  getList(params?: any) {
    return request({
      url: '/api/bargain/list',
      method: 'get',
      params
    })
  },

  // 获取砍价详情
  getDetail(id: number) {
    return request({
      url: `/api/bargain/${id}`,
      method: 'get'
    })
  },

  // 开始砍价
  startBargain(id: number) {
    return request({
      url: `/api/bargain/${id}/start`,
      method: 'post'
    })
  },

  // 帮助砍价
  helpBargain(recordId: number) {
    return request({
      url: `/api/bargain/record/${recordId}/help`,
      method: 'post'
    })
  },

  // 获取砍价记录详情
  getBargainRecord(recordId: number) {
    return request({
      url: `/api/bargain/record/${recordId}`,
      method: 'get'
    })
  },

  // 获取用户砍价记录
  getMyRecords() {
    return request({
      url: '/api/bargain/user/records',
      method: 'get'
    })
  },

  // 创建砍价订单
  createOrder(recordId: number, data: any) {
    return request({
      url: `/api/bargain/record/${recordId}/order`,
      method: 'post',
      data
    })
  }
}