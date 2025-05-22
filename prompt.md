请在此浏览器插件项目中集成艺爪付费会员系统，实现会员付费功能。
我的项目ID是: XXX
项目密钥是: XXX

免费用户的功能：
- 会员按钮显示"开通会员"，点击后显示付费界面。
- 全部下载按钮显示"下载全部(开通会员)"，点击后显示付费界面。

会员用户的功能：
- 会员按钮显示"我的会员"，点击后显示付费界面。
- 全部下载按钮显示"下载全部(VIP)"，点击后正常下载全部图片。

ezrevenue-sdk我已添加到项目中，请根据以下教程完成集成。

------

# 艺爪付费浏览器插件会员集成教程

[艺爪付费(EZRevenue)](https://www.ezboti.com/revenue/) 是为开发者提供的会员付费解决方案，可轻松集成到浏览器扩展中实现会员功能。本文介绍如何浏览器插件中集成艺爪付费会员功能。

## 代码集成

### 1. 配置权限
在 `manifest.json` 中添加以下权限和配置：
```json
"permissions": [
  "storage"
],
"host_permissions": [
  "https://revenue.ezboti.com/"
],
"background": {
  "service_worker": "background.js",
  "type": "module"
}
```

### 2. 引入SDK
将 EZRevenue SDK 文件放入插件目录：
```
ezrevenue-sdk/
  ├── background.js  // 支付后台逻辑
  └── ui.js         // 支付界面逻辑
```

在 `popup.html` 中需要显式引用 `ui.js`，在 `popup.js` 之前引入:
```html
<script src="ezrevenue-sdk/ui.js"></script>
<script src="popup.js"></script>
```

### 3. 后台服务集成

在 `background.js` 中注册支付服务：
```javascript
import { registerEzrevenueBackground } from './ezrevenue-sdk/background.js'

registerEzrevenueBackground({
  projectId: 'YOUR_PROJECT_ID', // 项目ID，从艺爪后台获取
  projectSecret: 'YOUR_SECRET_KEY', // 项目密钥，从艺爪后台获取
  paywallAlias: 'paywall_vip' // 付费界面别名，可选
})
```

SDK 会自动处理以下功能：
- 设备ID生成与存储
- 会员信息缓存
- 支付请求签名验证
- 会员状态更新

### 4. 前端界面集成

#### 4.1 添加支付按钮
在 `popup.html` 中添加会员按钮：
```html
<button id="vip-button">开通会员</button>
```

#### 4.2 初始化支付服务
在 `popup.js` 中：
```javascript
// createEzrevenueService 函数由引入的 ezrevenue-sdk/ui.js 提供
const vipService = createEzrevenueService()

// 会员按钮点击事件
vipButton.addEventListener('click', async () => {
  await vipService.showPaywallPopup()  // 显示付费界面
  await updateVipStatus()  // 更新界面上的会员状态显示
})

// 当 Popup 加载时，更新界面上的会员状态显示
document.addEventListener('DOMContentLoaded', async () => {
  await updateVipStatus()
})
```

#### 4.3 会员状态显示
```javascript
async function updateVipStatus() {
  const isVip = await vipService.isBalanceUsable()
  vipButton.innerText = isVip ? '我的会员' : '开通会员'
}
```

#### 4.4 支付流程说明

1. **用户点击支付按钮**：触发 `showPaywallPopup()` 显示付费界面
2. **打开支付窗口**：在新窗口加载艺爪付费界面
3. **支付完成**：窗口自动关闭，触发会员状态更新
4. **状态同步**：所有插件页面自动获取最新会员状态

#### 4.5 功能限制实现

在需要会员权限的功能处添加检查：
```javascript
downloadButton.addEventListener('click', async () => {
  const isVip = await vipService.isBalanceUsable()
  if (!isVip) {
    await vipService.showPaywallPopup()
    return
  }
  // VIP专属功能...
})
```

## 常见问题排查

- **跨域CORS错误**：检查 `manifest.json` 文件中 `host_permissions` 配置。
- **background.js import语法错误**：检查 `manifest.json` 文件中 `background: { "type": "module" }` 配置。
- **请求签名错误**：确认 `projectId` 和 `projectSecret` 已配置，且与艺爪后台配置一致。

## API参考

### `function registerEzrevenueBackground(): void`
注册支付后台服务

**参数:**

* `projectId` (`string`): 艺爪付费项目ID，必填，从艺爪后台获取
* `projectSecret` (`string`): 艺爪付费项目密钥，必填，从艺爪后台获取
* `paywallAlias` (`string`): 付费界面别名，可选，默认值为 `"paywall_vip"`
* `customerIdGetter` (`async function(): string`): 用于获取用户ID，可选，默认实现为自动生成设备ID并保存使用

### `function createEzrevenueService(): EzrevenueService`
创建会员付费服务实例

### `class EzrevenueService`
会员付费服务实例

#### `async function showPaywallPopup(): object`
打开付费界面窗口

#### `async function isBalanceUsable(): boolean`
检查会员权益是否可用

```javascript
// 检查特定权益
const isVip = await vipService.isBalanceUsable({
  equityAlias: 'equity_vip' // 权益别名
})
```

#### `async function getCustomerInfo(): object`

获取完整会员信息，具体字段参考文档 [接口 - 获取用户信息](https://www.ezboti.com/docs/revenue/api-customer-info/)

```javascript
const customer = await vipService.getCustomerInfo()
console.log(customer.balance_s) // 会员权益列表
```

------

通过以上步骤，即可成功在浏览器插件中集成艺爪付费会员系统。
