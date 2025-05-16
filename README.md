# 艺爪付费浏览器插件集成指南

[艺爪付费(ezrevenue)](https://www.ezboti.com/revenue/)是为开发者提供的会员付费解决方案，可轻松集成到浏览器扩展中实现会员功能。本文介绍如何在Chrome扩展中集成艺爪付费服务。

## 功能特性

- 会员状态管理
- 支付界面集成
- 订阅和一次性付费支持
- 多设备同步
- 支持兑换码

## 集成步骤

### 1. 获取项目凭证
前往[艺爪付费控制台](https://revenue.ezboti.com/)创建项目，获取:
- `projectId` 项目ID
- `projectSecret` 项目密钥

[参考教程配置权益、商品、支付渠道和会员界面](https://www.ezboti.com/docs/revenue/start/)

### 2. 安装SDK
将艺爪付费SDK文件加入扩展:
```bash
lib/
  ├── ezrevenue.js
  └── jose.bundle.js  # JWT处理库
```

### 3. 配置项目信息
在`config.js`中配置凭证:
```js
export const ezrevenueProjectId = '您的项目ID'
export const ezrevenueProjectSecret = '您的项目密钥'
```

## API使用示例

### 初始化客户端
```js
import { EzrevenueClient } from './lib/ezrevenue.js'
import { ezrevenueProjectId, ezrevenueProjectSecret } from './config.js'

const client = EzrevenueClient({
  projectId: ezrevenueProjectId,
  projectSecret: ezrevenueProjectSecret
})
```

### 查询会员信息
```js
const vipInfo = await client.call('customer.info', {
  paywall_alias: 'paywall_vip',
  customer: {
    external_id: deviceId // 设备唯一ID
  },
  include_balance: true
})
```

### 打开支付界面
```js
// 使用返回的支付界面URL
chrome.windows.create({
  url: vipInfo.home_link.url,
  type: 'popup',
  width: 800,
  height: 600
})
```

## 案例参考 - 图片下载器插件

本项目的`ezimage-downloader`目录是一个完整集成案例，实现了:
1. 设备ID生成(`lib/stringRandom.js`)
2. 会员状态管理(`background.js`)
3. 支付界面集成(`popup.js`)
4. VIP功能限制

主要集成点:
- 会员状态检查
- 支付界面弹窗
- VIP专属功能控制

## 更多文档

- [艺爪付费官方文档](https://www.ezboti.com/docs/revenue/)

## 技术支持

[联系方式](https://www.ezboti.com/docs/revenue/contact/)
