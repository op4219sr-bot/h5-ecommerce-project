-- H5电商系统数据库表结构
-- 创建数据库
CREATE DATABASE IF NOT EXISTS h5_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE h5_ecommerce;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
    password VARCHAR(255) NOT NULL COMMENT '密码',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(255) COMMENT '头像',
    gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown' COMMENT '性别',
    birthday DATE COMMENT '生日',
    level INT DEFAULT 1 COMMENT '用户等级',
    balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
    points INT DEFAULT 0 COMMENT '积分',
    inviter_id INT COMMENT '邀请人ID',
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_inviter (inviter_id),
    INDEX idx_status (status)
) COMMENT '用户表';

-- 商品分类表
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '分类名称',
    parent_id INT DEFAULT 0 COMMENT '父分类ID',
    level INT DEFAULT 1 COMMENT '分类层级',
    sort INT DEFAULT 0 COMMENT '排序',
    icon VARCHAR(255) COMMENT '图标',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id),
    INDEX idx_level (level),
    INDEX idx_sort (sort)
) COMMENT '商品分类表';

-- 商品表
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT '商品名称',
    description TEXT COMMENT '商品描述',
    category_id INT NOT NULL COMMENT '分类ID',
    brand_id INT COMMENT '品牌ID',
    price DECIMAL(10,2) NOT NULL COMMENT '销售价格',
    market_price DECIMAL(10,2) COMMENT '市场价格',
    cost_price DECIMAL(10,2) COMMENT '成本价格',
    stock INT DEFAULT 0 COMMENT '库存',
    sales INT DEFAULT 0 COMMENT '销量',
    images JSON COMMENT '商品图片',
    specs JSON COMMENT '商品规格',
    status ENUM('active', 'inactive', 'sold_out') DEFAULT 'active' COMMENT '状态',
    sort INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_brand (brand_id),
    INDEX idx_price (price),
    INDEX idx_status (status),
    INDEX idx_sort (sort),
    FULLTEXT idx_name (name)
) COMMENT '商品表';

-- 营销活动表
CREATE TABLE marketing_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT '活动名称',
    type ENUM('seckill', 'group_buy', 'bargain', 'coupon') NOT NULL COMMENT '活动类型',
    description TEXT COMMENT '活动描述',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME NOT NULL COMMENT '结束时间',
    status ENUM('pending', 'active', 'ended', 'cancelled') DEFAULT 'pending' COMMENT '状态',
    config JSON COMMENT '活动配置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_time (start_time, end_time)
) COMMENT '营销活动表';

-- 秒杀活动表
CREATE TABLE seckill_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id INT NOT NULL COMMENT '营销活动ID',
    product_id INT NOT NULL COMMENT '商品ID',
    seckill_price DECIMAL(10,2) NOT NULL COMMENT '秒杀价格',
    stock INT NOT NULL COMMENT '秒杀库存',
    limit_per_user INT DEFAULT 1 COMMENT '每人限购数量',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME NOT NULL COMMENT '结束时间',
    status ENUM('pending', 'active', 'ended') DEFAULT 'pending' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activity (activity_id),
    INDEX idx_product (product_id),
    INDEX idx_status (status),
    INDEX idx_time (start_time, end_time)
) COMMENT '秒杀活动表';

-- 秒杀订单表
CREATE TABLE seckill_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    seckill_id INT NOT NULL COMMENT '秒杀活动ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '数量',
    price DECIMAL(10,2) NOT NULL COMMENT '单价',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    status ENUM('pending', 'paid', 'cancelled', 'expired') DEFAULT 'pending' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_seckill (seckill_id),
    INDEX idx_status (status)
) COMMENT '秒杀订单表';

-- 拼团活动表
CREATE TABLE group_buy_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id INT NOT NULL COMMENT '营销活动ID',
    product_id INT NOT NULL COMMENT '商品ID',
    group_price DECIMAL(10,2) NOT NULL COMMENT '拼团价格',
    original_price DECIMAL(10,2) NOT NULL COMMENT '原价',
    min_people INT NOT NULL COMMENT '最少成团人数',
    max_people INT NOT NULL COMMENT '最多成团人数',
    time_limit INT NOT NULL COMMENT '成团时间限制(小时)',
    status ENUM('active', 'ended') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activity (activity_id),
    INDEX idx_product (product_id),
    INDEX idx_status (status)
) COMMENT '拼团活动表';

-- 拼团表
CREATE TABLE group_buy_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_buy_id INT NOT NULL COMMENT '拼团活动ID',
    leader_id INT NOT NULL COMMENT '团长ID',
    current_people INT DEFAULT 1 COMMENT '当前人数',
    target_people INT NOT NULL COMMENT '目标人数',
    expire_time DATETIME NOT NULL COMMENT '过期时间',
    status ENUM('active', 'success', 'failed') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_group_buy (group_buy_id),
    INDEX idx_leader (leader_id),
    INDEX idx_status (status),
    INDEX idx_expire (expire_time)
) COMMENT '拼团表';

-- 拼团成员表
CREATE TABLE group_buy_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL COMMENT '拼团ID',
    user_id INT NOT NULL COMMENT '用户ID',
    is_leader TINYINT(1) DEFAULT 0 COMMENT '是否为团长',
    join_time DATETIME NOT NULL COMMENT '加入时间',
    INDEX idx_group (group_id),
    INDEX idx_user (user_id),
    UNIQUE KEY uk_group_user (group_id, user_id)
) COMMENT '拼团成员表';

-- 拼团订单表
CREATE TABLE group_buy_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    group_id INT NOT NULL COMMENT '拼团ID',
    group_buy_id INT NOT NULL COMMENT '拼团活动ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '数量',
    price DECIMAL(10,2) NOT NULL COMMENT '单价',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    status ENUM('pending', 'to_pay', 'paid', 'cancelled') DEFAULT 'pending' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_group (group_id),
    INDEX idx_status (status)
) COMMENT '拼团订单表';

-- 砍价活动表
CREATE TABLE bargain_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id INT NOT NULL COMMENT '营销活动ID',
    product_id INT NOT NULL COMMENT '商品ID',
    original_price DECIMAL(10,2) NOT NULL COMMENT '原价',
    min_price DECIMAL(10,2) NOT NULL COMMENT '最低价',
    max_bargain_count INT NOT NULL COMMENT '最大砍价次数',
    time_limit INT NOT NULL COMMENT '砍价时间限制(小时)',
    status ENUM('active', 'ended') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activity (activity_id),
    INDEX idx_product (product_id),
    INDEX idx_status (status)
) COMMENT '砍价活动表';

-- 砍价记录表
CREATE TABLE bargain_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bargain_id INT NOT NULL COMMENT '砍价活动ID',
    user_id INT NOT NULL COMMENT '用户ID',
    original_price DECIMAL(10,2) NOT NULL COMMENT '原价',
    current_price DECIMAL(10,2) NOT NULL COMMENT '当前价格',
    target_price DECIMAL(10,2) NOT NULL COMMENT '目标价格',
    bargain_count INT DEFAULT 0 COMMENT '已砍价次数',
    max_bargain_count INT NOT NULL COMMENT '最大砍价次数',
    expire_time DATETIME NOT NULL COMMENT '过期时间',
    status ENUM('active', 'success', 'expired') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bargain (bargain_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_expire (expire_time)
) COMMENT '砍价记录表';

-- 砍价帮助表
CREATE TABLE bargain_helps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    record_id INT NOT NULL COMMENT '砍价记录ID',
    helper_id INT NOT NULL COMMENT '帮助者ID',
    bargain_amount DECIMAL(10,2) NOT NULL COMMENT '砍价金额',
    help_time DATETIME NOT NULL COMMENT '帮助时间',
    INDEX idx_record (record_id),
    INDEX idx_helper (helper_id),
    UNIQUE KEY uk_record_helper (record_id, helper_id)
) COMMENT '砍价帮助表';

-- 砍价订单表
CREATE TABLE bargain_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    bargain_record_id INT NOT NULL COMMENT '砍价记录ID',
    bargain_id INT NOT NULL COMMENT '砍价活动ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '数量',
    price DECIMAL(10,2) NOT NULL COMMENT '单价',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    status ENUM('pending', 'paid', 'cancelled', 'expired') DEFAULT 'pending' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_record (bargain_record_id),
    INDEX idx_status (status)
) COMMENT '砍价订单表';

-- 购物车表
CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    product_id INT NOT NULL COMMENT '商品ID',
    sku_id INT COMMENT 'SKU ID',
    quantity INT NOT NULL COMMENT '数量',
    price DECIMAL(10,2) NOT NULL COMMENT '价格',
    selected TINYINT(1) DEFAULT 1 COMMENT '是否选中',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_product (product_id),
    UNIQUE KEY uk_user_product_sku (user_id, product_id, sku_id)
) COMMENT '购物车表';

-- 订单表
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '商品总金额',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
    shipping_fee DECIMAL(10,2) DEFAULT 0.00 COMMENT '运费',
    final_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
    payment_method VARCHAR(50) COMMENT '支付方式',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
    shipping_address JSON COMMENT '收货地址',
    remark TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_order_no (order_no),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status)
) COMMENT '订单表';

-- 订单商品表
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL COMMENT '订单ID',
    product_id INT NOT NULL COMMENT '商品ID',
    sku_id INT COMMENT 'SKU ID',
    product_name VARCHAR(255) NOT NULL COMMENT '商品名称',
    product_image VARCHAR(255) COMMENT '商品图片',
    price DECIMAL(10,2) NOT NULL COMMENT '单价',
    quantity INT NOT NULL COMMENT '数量',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '小计',
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) COMMENT '订单商品表';

-- 轮播图表
CREATE TABLE banners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL COMMENT '标题',
    image VARCHAR(255) NOT NULL COMMENT '图片',
    link VARCHAR(255) COMMENT '链接',
    sort INT DEFAULT 0 COMMENT '排序',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sort (sort),
    INDEX idx_status (status)
) COMMENT '轮播图表';

-- 公告表
CREATE TABLE notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL COMMENT '标题',
    content TEXT NOT NULL COMMENT '内容',
    type ENUM('system', 'activity', 'maintenance') DEFAULT 'system' COMMENT '类型',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_status (status)
) COMMENT '公告表';

-- 用户地址表
CREATE TABLE user_addresses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    name VARCHAR(50) NOT NULL COMMENT '收货人',
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    province VARCHAR(50) NOT NULL COMMENT '省份',
    city VARCHAR(50) NOT NULL COMMENT '城市',
    district VARCHAR(50) NOT NULL COMMENT '区县',
    detail VARCHAR(255) NOT NULL COMMENT '详细地址',
    is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
) COMMENT '用户地址表';