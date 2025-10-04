<template>
  <div class="seckill-list">
    <!-- 头部 -->
    <van-nav-bar
      title="限时秒杀"
      left-text="返回"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 时间轴 -->
    <div class="time-tabs">
      <div class="time-tab-list">
        <div
          v-for="(time, index) in timeSlots"
          :key="index"
          class="time-tab"
          :class="{ active: currentTimeIndex === index }"
          @click="switchTimeSlot(index)"
        >
          <div class="time">{{ time.time }}</div>
          <div class="status">{{ time.status }}</div>
        </div>
      </div>
    </div>

    <!-- 倒计时 -->
    <div class="countdown-section" v-if="currentTimeSlot">
      <div class="countdown-text">
        {{ currentTimeSlot.status === '抢购中' ? '距离结束' : '距离开始' }}
      </div>
      <van-count-down
        :time="countdownTime"
        format="HH:mm:ss"
        @finish="onCountdownFinish"
      />
    </div>

    <!-- 商品列表 -->
    <div class="product-list">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <div
          v-for="item in seckillList"
          :key="item.id"
          class="seckill-item"
          @click="goToDetail(item)"
        >
          <div class="product-image">
            <van-image
              :src="item.product.images[0]"
              fit="cover"
              lazy-load
            />
            <div class="discount-tag">
              {{ Math.round((1 - item.seckill_price / item.product.price) * 100) }}%
            </div>
          </div>
          
          <div class="product-info">
            <div class="product-name">{{ item.product.name }}</div>
            <div class="price-section">
              <span class="seckill-price">¥{{ item.seckill_price }}</span>
              <span class="original-price">¥{{ item.product.price }}</span>
            </div>
            <div class="progress-section">
              <div class="progress-text">
                已抢{{ item.sold_count }}/{{ item.stock }}件
              </div>
              <van-progress
                :percentage="(item.sold_count / item.stock) * 100"
                color="#ff6b35"
                track-color="#f5f5f5"
              />
            </div>
          </div>
          
          <div class="action-section">
            <van-button
              v-if="item.status === 'pending'"
              type="warning"
              size="small"
              disabled
            >
              即将开始
            </van-button>
            <van-button
              v-else-if="item.status === 'active'"
              type="danger"
              size="small"
              @click.stop="participateSeckill(item)"
            >
              立即抢购
            </van-button>
            <van-button
              v-else
              type="default"
              size="small"
              disabled
            >
              已结束
            </van-button>
          </div>
        </div>
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { seckillApi } from '@/api/marketing'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const finished = ref(false)
const seckillList = ref([])
const currentTimeIndex = ref(0)
const countdownTime = ref(0)

// 时间段数据
const timeSlots = ref([
  { time: '10:00', status: '已结束' },
  { time: '12:00', status: '抢购中' },
  { time: '14:00', status: '即将开始' },
  { time: '16:00', status: '即将开始' },
  { time: '18:00', status: '即将开始' },
  { time: '20:00', status: '即将开始' }
])

// 计算属性
const currentTimeSlot = computed(() => {
  return timeSlots.value[currentTimeIndex.value]
})

// 方法
const loadSeckillList = async () => {
  try {
    loading.value = true
    const response = await seckillApi.getList({
      time_slot: currentTimeSlot.value?.time
    })
    seckillList.value = response.data.list
    finished.value = true
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (!finished.value) {
    loadSeckillList()
  }
}

const switchTimeSlot = (index: number) => {
  currentTimeIndex.value = index
  finished.value = false
  seckillList.value = []
  loadSeckillList()
  updateCountdown()
}

const updateCountdown = () => {
  const now = new Date()
  const currentSlot = currentTimeSlot.value
  
  if (currentSlot.status === '抢购中') {
    // 计算到结束时间的倒计时
    const endTime = new Date()
    endTime.setHours(parseInt(currentSlot.time.split(':')[0]) + 2, 0, 0, 0)
    countdownTime.value = Math.max(0, endTime.getTime() - now.getTime())
  } else if (currentSlot.status === '即将开始') {
    // 计算到开始时间的倒计时
    const startTime = new Date()
    startTime.setHours(parseInt(currentSlot.time.split(':')[0]), 0, 0, 0)
    countdownTime.value = Math.max(0, startTime.getTime() - now.getTime())
  }
}

const onCountdownFinish = () => {
  // 倒计时结束，刷新页面状态
  loadSeckillList()
  updateCountdown()
}

const participateSeckill = async (item: any) => {
  try {
    await showConfirmDialog({
      title: '确认抢购',
      message: `确认以 ¥${item.seckill_price} 的价格抢购该商品？`
    })
    
    const response = await seckillApi.participate(item.id, {
      quantity: 1
    })
    
    if (response.success) {
      showToast('抢购成功！')
      // 跳转到订单页面
      router.push(`/order/${response.data.order_id}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      showToast(error.message || '抢购失败')
    }
  }
}

const goToDetail = (item: any) => {
  router.push(`/seckill/${item.id}`)
}

// 生命周期
onMounted(() => {
  loadSeckillList()
  updateCountdown()
  
  // 每秒更新倒计时
  setInterval(updateCountdown, 1000)
})
</script>

<style scoped>
.seckill-list {
  background: #f8f8f8;
  min-height: 100vh;
}

.time-tabs {
  background: white;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
}

.time-tab-list {
  display: flex;
  overflow-x: auto;
  padding: 0 16px;
}

.time-tab {
  flex-shrink: 0;
  text-align: center;
  margin-right: 24px;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.time-tab.active {
  background: #ff6b35;
  color: white;
}

.time-tab .time {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.time-tab .status {
  font-size: 12px;
  opacity: 0.8;
}

.countdown-section {
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  padding: 16px;
  text-align: center;
}

.countdown-text {
  font-size: 14px;
  margin-bottom: 8px;
}

.product-list {
  padding: 16px;
}

.seckill-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-image {
  position: relative;
  width: 80px;
  height: 80px;
  margin-right: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.discount-tag {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4444;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 0 8px 0 8px;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-section {
  margin-bottom: 8px;
}

.seckill-price {
  color: #ff4444;
  font-size: 18px;
  font-weight: bold;
  margin-right: 8px;
}

.original-price {
  color: #999;
  font-size: 12px;
  text-decoration: line-through;
}

.progress-section {
  font-size: 12px;
  color: #666;
}

.progress-text {
  margin-bottom: 4px;
}

.action-section {
  margin-left: 16px;
}
</style>