# H5电商平台项目

## 项目概述
一个完整的电商平台解决方案，包含：
- 后端API服务 (Node.js + Express)
- 前端H5应用 (Vue 3 + Vite)
- 秒杀、拼团、砍价等营销功能
- 完整的用户认证和订单系统

## 技术栈

### 后端技术栈
- **运行时**: Node.js 18+
- **框架**: Express 4.x
- **语言**: TypeScript 5.x
- **数据库**: MySQL 8.0 + Redis 7.x
- **测试框架**: Jest + Supertest
- **其他**:
  - Winston (日志)
  - JWT (认证)
  - node-cron (定时任务)

### 前端技术栈
- **框架**: Vue 3 + Pinia + Vue Router
- **构建工具**: Vite 4.x
- **UI组件库**: Vant 4.x
- **其他**:
  - Axios (HTTP客户端)
  - ECharts (数据可视化)
  - PostCSS (CSS处理)

## 功能模块

### 核心功能
1. **用户系统**
   - 注册/登录/找回密码
   - JWT认证
   - 个人信息管理

2. **商品系统**
   - 商品分类浏览
   - 商品搜索
   - 商品详情

3. **订单系统**
   - 购物车管理
   - 订单创建/支付
   - 订单历史查询

### 营销功能
1. **秒杀活动**
   - 限时秒杀
   - 库存控制
   - 高并发处理

2. **拼团活动**
   - 多人成团
   - 拼团进度展示
   - 拼团优惠

3. **砍价活动**
   - 好友助力砍价
   - 砍价进度展示
   - 砍价成功购买

## 项目结构

### 后端目录结构
```
h5-ecommerce-backend/
├── src/
│   ├── config/        # 配置文件
│   ├── controllers/   # 控制器
│   ├── middleware/    # 中间件
│   ├── routes/        # 路由定义
│   ├── services/      # 业务逻辑
│   ├── types/         # TypeScript类型定义
│   ├── utils/         # 工具函数
│   ├── app.ts         # Express应用入口
│   └── server.ts      # 服务启动入口
├── tests/             # 单元测试
├── database/          # 数据库脚本
└── testsprite_tests/  # 测试报告和计划
```

### 前端目录结构
```
h5-ecommerce-frontend/
├── src/
│   ├── api/           # API请求封装
│   ├── assets/        # 静态资源
│   ├── components/    # 公共组件
│   ├── router/        # 路由配置
│   ├── stores/        # Pinia状态管理
│   ├── utils/         # 工具函数
│   ├── views/         # 页面组件
│   └── main.ts        # 应用入口
├── public/            # 公共资源
└── vite.config.ts     # Vite配置
```

## 开发环境配置

### 后端
1. 安装依赖
```bash
cd h5-ecommerce-backend
npm install
```

2. 配置环境变量
复制`.env.example`为`.env`并修改配置

3. 启动开发服务器
```bash
npm run dev
```

### 前端
1. 安装依赖
```bash
cd h5-ecommerce-frontend
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

## 部署指南

### 生产环境部署
1. 构建生产版本
```bash
# 后端
cd h5-ecommerce-backend
npm run build

# 前端
cd h5-ecommerce-frontend
npm run build
```

2. 使用Docker部署
```bash
docker-compose up -d
```

## 测试
```bash
# 运行单元测试
npm test

# 生成测试报告
npm run test:report
```

## 许可证
GNU General Public License v3.0 (GPL-3.0)

本软件使用GPL-3.0开源协议，任何基于本项目的二次创作也必须以相同协议开源。