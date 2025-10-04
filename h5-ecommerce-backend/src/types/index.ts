// 通用响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
}

// 分页参数接口
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 用户相关接口
export interface User {
  id: number;
  phone: string;
  nickname?: string;
  avatar?: string;
  gender: 'male' | 'female' | 'unknown';
  birthday?: Date;
  level: number;
  balance: number;
  points: number;
  status: 'active' | 'inactive' | 'banned';
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateData {
  phone: string;
  password: string;
  nickname?: string;
  avatar?: string;
  inviter_id?: number;
}

// 商品相关接口
export interface Product {
  id: number;
  name: string;
  description: string;
  category_id: number;
  brand_id?: number;
  price: number;
  market_price: number;
  cost_price: number;
  stock: number;
  sales: number;
  images: string[];
  status: 'active' | 'inactive' | 'sold_out';
  sort: number;
  created_at: Date;
  updated_at: Date;
}

// 订单相关接口
export interface Order {
  id: number;
  user_id: number;
  order_no: string;
  total_amount: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_address: string;
  remark?: string;
  created_at: Date;
  updated_at: Date;
}

// 营销活动相关接口
export interface MarketingActivity {
  id: number;
  name: string;
  type: 'seckill' | 'group_buy' | 'bargain' | 'coupon';
  description?: string;
  start_time: Date;
  end_time: Date;
  status: 'pending' | 'active' | 'ended' | 'cancelled';
  config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// 秒杀活动接口
export interface SeckillActivity {
  id: number;
  activity_id: number;
  product_id: number;
  seckill_price: number;
  stock: number;
  limit_per_user: number;
  start_time: Date;
  end_time: Date;
  status: 'pending' | 'active' | 'ended';
  created_at: Date;
  updated_at: Date;
}

// 拼团活动接口
export interface GroupBuyActivity {
  id: number;
  activity_id: number;
  product_id: number;
  group_price: number;
  original_price: number;
  min_people: number;
  max_people: number;
  time_limit: number; // 成团时间限制（小时）
  status: 'active' | 'ended';
  created_at: Date;
  updated_at: Date;
}

// 砍价活动接口
export interface BargainActivity {
  id: number;
  activity_id: number;
  product_id: number;
  original_price: number;
  min_price: number;
  max_bargain_count: number;
  time_limit: number; // 砍价时间限制（小时）
  status: 'active' | 'ended';
  created_at: Date;
  updated_at: Date;
}

// 购物车接口
export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  sku_id?: number;
  quantity: number;
  price: number;
  selected: boolean;
  created_at: Date;
  updated_at: Date;
}

// 地址接口
export interface Address {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}