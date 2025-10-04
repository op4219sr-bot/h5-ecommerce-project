<template>
  <div class="bargain-list">
    <!-- 头部 -->
    <van-nav-bar
      title="砍价免费拿"
      left-text="返回"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 规则说明 -->
    <div class="rules-banner">
      <div class="rules-text">
        <van-icon name="info-o" />
        邀请好友帮忙砍价，砍到底价即可免费获得商品
      </div>
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
          v-for="item in bargainList"
          :key="item.id"
          class="bargain-item"
          @click="goToDetail(item)"
        >
          <div class="product-image">
            <van-image
              :src="item.product.images[0]"
              fit="cover"
              lazy-load
            />
            <div class="bargain-tag">砍价</div>
          </div>
          
          <div class="product-info">
            <div class="product-name">{{ item.product.name }}</div>
            <div class="price-info">
              <div class="current-price">
                <span class="label">砍至</span>
                <span class="price">¥{{ item.min_price }}</span>
                <span class="free">免费拿</span>
              </div>
              <div class="original-price">
                原价 ¥{{ item.original_price }}
              </div>
            </div>
            
            <!-- 砍价进度 -->
            <div class="bargain-progress">
              <div class="progress-info">
                <span>已砍 ¥{{ (item.original_price - item.min_price).toFixed(2) }}</span>
                <span>{{ item.participant_count }}人参与</span>
              </div>
              <van-progress
                :percentage="100"
                color="#ff6b35"
                track-color="#f5f5f5"
                stroke-width="6"
              />
            </div>
          </div>
          
          <div class="action-section">
            <div class="action-buttons">
              <van-button
                type="danger"
                size="small"
                round
                @click.stop="startBargain(item)"
              >
                我要砍价
              </van-button>
              <div class="help-count">
                {{ item.today_help_count }}人帮砍
              </div>
            </div>
          </div>
        </div>
      </van-list>
    </div>

    <!-- 我的砍价记录 -->
    <div class="my-bargains" v-if="myBargains.length">
      <div class="section-title">我的砍价</div>
      <div
        v-for="record in myBargains"
        :key="record.id"
        class="my-bargain-item"
        @click="goToBargainRecord(record)"
      >
        <div class="record-image">
          <van-image
            :src="record.product.images[0]"
            fit="cover"
            width="60"
            height="60"
            round
          />
        </div>
        <div class="record-info">
          <div class="product-name">{{ record.product.name }}</div>
          <div class="bargain-info">
            <span class="current">¥{{ record.current_price }}</span>
            <span class="target">目标价 ¥{{ record.target_price }}</span>
          </div>
          <div class="help-info">
            {{ record.bargain_count }}/{{ record.max_bargain_count }}次砍价机会
          </div>
        </div>
        <div class="record-status">
          <van-tag
            :type="getStatusType(record.status)"
            size="medium"
          >
            {{ getStatusText(record.status) }}
          </van-tag>
          <div class="countdown" v-if="record.status === 'active'">
            <van-count-down
              :time="getCountdownTime(record.expire_time)"
              format="HH:mm:ss"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { bargainApi } from '@/api/marketing'

// 定义类型接口
interface BargainItem {
  id: number
  product: {
    id: number
    name: string
    images: string[]
  }
  min_price: number
  original_price: number
  participant_count: number
  today_help_count: number
}

interface BargainRecord {
  id: number
  product: {
    id: number
    name: string
    images: string[]
  }
  current_price: number
  target_price: number
  bargain_count: number
  max_bargain_count: number
  status: string
  expire_time: string
}

const router = useRouter()

// 响应式数据
const loading = ref(false)
const finished = ref(false)
const bargainList = ref<BargainItem[]>([])
const myBargains = ref<BargainRecord[]>([])
const page = ref(1)

// 方法
const loadBargainList = async (reset = false) => {
  try {
    loading.value = true
    
    if (reset) {
      page.value = 1
      bargainList.value = []
      finished.value = false
    }
    
    const response = await bargainApi.getList({
      page: page.value
    })
    
    const newList = response.data.list
    if (reset) {
      bargainList.value = newList
    } else {
      bargainList.value.push(...newList)
    }
    
    finished.value = newList.length < 10
    page.value++
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const loadMyBargains = async () => {
  try {
    const response = await bargainApi.getMyRecords()
    myBargains.value = response.data.list
  } catch (error) {
    console.error('加载我的砍价记录失败', error)
  }
}

const loadMore = () => {
  if (!finished.value) {
    loadBargainList()
  }
}

const getCountdownTime = (expireTime: string) => {
  const now = new Date().getTime()
  const expire = new Date(expireTime).getTime()
  return Math.max(0, expire - now)
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'active':
      return 'warning'
    case 'success':
      return 'success'
    case 'expired':
      return 'default'
    default:
      return 'default'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '砍价中'
    case 'success':
      return '砍价成功'
    case 'expired':
      return '已过期'
    default:
      return '未知'
  }
}

const startBargain = async (item: BargainItem) => {
  try {
    await showConfirmDialog({
      title: '开始砍价',
      message: `确认开始砍价 ${item.product.name}？`
    })
    
    const response = await bargainApi.startBargain(item.id)
    
    if (response.success) {
      showToast('砍价开始！')
      router.push(`/bargain/record/${response.data.record_id}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      showToast(error.message || '开始砍价失败')
    }
  }
}

const goToDetail = (item: BargainItem) => {
  router.push(`/bargain/${item.id}`)
}

const goToBargainRecord = (record: BargainRecord) => {
  router.push(`/bargain/record/${record.id}`)
}

// 生命周期
onMounted(() => {
  loadBargainList(true)
  loadMyBargains()
})
</script>

<style scoped>
.bargain-list {
  background: #f8f8f8;
  min-height: 100vh;
}

.rules-banner {
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.rules-text {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.rules-text .van-icon {
  margin-right: 8px;
}

.product-list {
  padding: 0 16px;
}

.bargain-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
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

.bargain-tag {
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
  margin-right: 16px;
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

.price-info {
  margin-bottom: 12px;
}

.current-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 4px;
}

.current-price .label {
  font-size: 12px;
  color: #666;
  margin-right: 4px;
}

.current-price .price {
  color: #ff4444;
  font-size: 18px;
  font-weight: bold;
  margin-right: 8px;
}

.current-price .free {
  background: #ff4444;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
}

.original-price {
  color: #999;
  font-size: 12px;
  text-decoration: line-through;
}

.bargain-progress {
  font-size: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: #666;
}

.action-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.action-buttons {
  text-align: center;
}

.help-count {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.my-bargains {
  margin-top: 24px;
  padding: 0 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 4px solid #ff6b35;
}

.my-bargain-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.record-image {
  margin-right: 16px;
}

.record-info {
  flex: 1;
}

.record-info .product-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.bargain-info {
  margin-bottom: 4px;
}

.bargain-info .current {
  color: #ff4444;
  font-size: 16px;
  font-weight: bold;
  margin-right: 8px;
}

.bargain-info .target {
  color: #666;
  font-size: 12px;
}

.help-info {
  font-size: 12px;
  color: #666;
}

.record-status {
  text-align: center;
}

.countdown {
  font-size: 10px;
  color: #ff4444;
  margin-top: 4px;
}
</style>