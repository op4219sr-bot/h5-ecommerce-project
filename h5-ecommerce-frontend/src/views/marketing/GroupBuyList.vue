<template>
  <div class="group-buy-list">
    <!-- 头部 -->
    <van-nav-bar
      title="拼团购买"
      left-text="返回"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <van-tabs v-model:active="activeTab" @change="onTabChange">
        <van-tab title="全部" name="all" />
        <van-tab title="即将成团" name="almost" />
        <van-tab title="新开团" name="new" />
      </van-tabs>
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
          v-for="item in groupBuyList"
          :key="item.id"
          class="group-buy-item"
          @click="goToDetail(item)"
        >
          <div class="product-image">
            <van-image
              :src="item.product.images[0]"
              fit="cover"
              lazy-load
            />
            <div class="group-tag">
              {{ item.min_people }}人团
            </div>
          </div>
          
          <div class="product-info">
            <div class="product-name">{{ item.product.name }}</div>
            <div class="price-section">
              <div class="group-price">
                <span class="price">¥{{ item.group_price }}</span>
                <span class="people">{{ item.min_people }}人价</span>
              </div>
              <div class="original-price">单买价 ¥{{ item.original_price }}</div>
            </div>
            <div class="save-amount">
              省 ¥{{ (item.original_price - item.group_price).toFixed(2) }}
            </div>
          </div>
        </div>

        <!-- 正在进行的团 -->
        <div class="active-groups" v-if="item.active_groups?.length">
          <div class="group-title">正在进行的团</div>
          <div
            v-for="group in item.active_groups.slice(0, 3)"
            :key="group.id"
            class="group-item"
            @click.stop="joinGroup(group)"
          >
            <div class="group-info">
              <div class="leader-info">
                <van-image
                  :src="group.leader.avatar"
                  round
                  width="24"
                  height="24"
                />
                <span class="leader-name">{{ group.leader.nickname }}</span>
              </div>
              <div class="group-progress">
                <span class="current">{{ group.current_people }}</span>
                /
                <span class="target">{{ group.target_people }}</span>人
              </div>
            </div>
            <div class="group-action">
              <div class="countdown">
                <van-count-down
                  :time="getCountdownTime(group.expire_time)"
                  format="HH:mm:ss"
                />
              </div>
              <van-button type="danger" size="mini">
                去拼团
              </van-button>
            </div>
          </div>
        </div>

        <!-- 开团按钮 -->
        <div class="start-group-section">
          <van-button
            type="warning"
            block
            round
            @click.stop="startGroup(item)"
          >
            我要开团
          </van-button>
        </div>
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { groupBuyApi } from '@/api/marketing'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const finished = ref(false)
const groupBuyList = ref([])
const activeTab = ref('all')
const page = ref(1)

// 方法
const loadGroupBuyList = async (reset = false) => {
  try {
    loading.value = true
    
    if (reset) {
      page.value = 1
      groupBuyList.value = []
      finished.value = false
    }
    
    const response = await groupBuyApi.getList({
      page: page.value,
      type: activeTab.value
    })
    
    const newList = response.data.list
    if (reset) {
      groupBuyList.value = newList
    } else {
      groupBuyList.value.push(...newList)
    }
    
    finished.value = newList.length < 10
    page.value++
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (!finished.value) {
    loadGroupBuyList()
  }
}

const onTabChange = () => {
  loadGroupBuyList(true)
}

const getCountdownTime = (expireTime: string) => {
  const now = new Date().getTime()
  const expire = new Date(expireTime).getTime()
  return Math.max(0, expire - now)
}

const startGroup = async (item: any) => {
  try {
    await showConfirmDialog({
      title: '开团确认',
      message: `确认开团购买 ${item.product.name}？`
    })
    
    const response = await groupBuyApi.startGroup(item.id, {
      quantity: 1
    })
    
    if (response.success) {
      showToast('开团成功！')
      router.push(`/group-buy/group/${response.data.group_id}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      showToast(error.message || '开团失败')
    }
  }
}

const joinGroup = async (group: any) => {
  try {
    await showConfirmDialog({
      title: '参团确认',
      message: `确认参加 ${group.leader.nickname} 的团？`
    })
    
    const response = await groupBuyApi.joinGroup(group.id, {
      quantity: 1
    })
    
    if (response.success) {
      showToast('参团成功！')
      router.push(`/group-buy/group/${group.id}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      showToast(error.message || '参团失败')
    }
  }
}

const goToDetail = (item: any) => {
  router.push(`/group-buy/${item.id}`)
}

// 生命周期
onMounted(() => {
  loadGroupBuyList(true)
})
</script>

<style scoped>
.group-buy-list {
  background: #f8f8f8;
  min-height: 100vh;
}

.filter-bar {
  background: white;
  border-bottom: 1px solid #eee;
}

.product-list {
  padding: 16px;
}

.group-buy-item {
  background: white;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-image {
  position: relative;
  width: 100%;
  height: 200px;
}

.group-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
}

.product-info {
  padding: 16px;
}

.product-name {
  font-size: 16px;
  color: #333;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.group-price {
  display: flex;
  align-items: baseline;
}

.group-price .price {
  color: #ff4444;
  font-size: 20px;
  font-weight: bold;
  margin-right: 4px;
}

.group-price .people {
  color: #ff4444;
  font-size: 12px;
}

.original-price {
  color: #999;
  font-size: 12px;
  text-decoration: line-through;
}

.save-amount {
  color: #ff4444;
  font-size: 12px;
  margin-bottom: 16px;
}

.active-groups {
  border-top: 1px solid #eee;
  padding: 16px;
}

.group-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;
  font-weight: bold;
}

.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 8px;
}

.group-info {
  flex: 1;
}

.leader-info {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.leader-name {
  margin-left: 8px;
  font-size: 12px;
  color: #666;
}

.group-progress {
  font-size: 12px;
  color: #333;
}

.group-action {
  text-align: center;
}

.countdown {
  font-size: 10px;
  color: #ff4444;
  margin-bottom: 4px;
}

.start-group-section {
  padding: 16px;
  border-top: 1px solid #eee;
}
</style>