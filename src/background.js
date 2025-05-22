import { EzrevenueClient } from './ezrevenue.js'
import { generateDeviceUniqueId } from './stringRandom.js'

export function createDeviceIdGetter({ prefix, storageKey } = {}) {
  prefix = prefix || ''
  storageKey = storageKey || 'ezrevenueDeviceId'
  /**
   * 获取或生成设备唯一ID
   * @returns {Promise<string>} 设备唯一ID
   * @description 优先从chrome.storage.local读取设备ID，不存在则生成新ID并存储
   */
  async function getOrCreateDeviceId() {
    const data = await chrome.storage.local.get(storageKey)
    let deviceId = data[storageKey]
    if (!deviceId) {
      deviceId = prefix + generateDeviceUniqueId()
      console.log(`create deviceId ${deviceId}`)
      await chrome.storage.local.set({ [storageKey]: deviceId })
    } else {
      console.log(`get deviceId ${deviceId}`)
    }
    return deviceId
  }
  return getOrCreateDeviceId
}

export function registerEzrevenueBackground({
  projectId,
  projectSecret,
  paywallAlias,
  customerIdGetter,
}) {
  paywallAlias = paywallAlias || 'paywall_vip'
  if (!customerIdGetter) {
    customerIdGetter = createDeviceIdGetter()
  }

  // 暂存会员信息
  const state = {
    customerInfo: null,
    lastChecked: null,
  }

  /**
   * 获取会员信息(外层包装)
   * @param {Object} request 请求参数
   * @param {boolean} [request.refresh] 是否强制刷新
   * @returns {Promise<Object>} 返回结果对象包含:
   *   - success: boolean 是否成功
   *   - data: Object 会员信息(成功时)
   *   - error: string 错误信息(失败时)
   */
  async function getCustomerInfo(request) {
    try {
      const customerInfo = await getCustomerInfoAsync(request)
      return {
        success: true,
        data: customerInfo,
      }
    } catch (err) {
      return {
        success: false,
        error: err.message || err,
      }
    }
  }

  /**
   * 获取会员信息(带缓存逻辑)
   * @param {Object} request 请求参数
   * @param {boolean} [request.refresh] 是否强制刷新
   * @returns {Promise<Object>} 会员信息对象
   * @description 缓存有效期30分钟，过期或强制刷新时重新获取
   */
  async function getCustomerInfoAsync(request) {
    if (request.refresh) {
      state.customerInfo = null
      state.lastChecked = null
    }
    if (state.customerInfo) {
      let lastChecked = state.lastChecked
      let isExpired = Date.now() - lastChecked > 30 * 60 * 1000
      if (!lastChecked || isExpired) {
        state.customerInfo = null
        state.lastChecked = null
      }
    }
    if (!state.customerInfo) {
      state.customerInfo = await getCustomerInfoImpl()
      state.lastChecked = Date.now()
    }
    return state.customerInfo
  }

  /**
   * 调用艺爪API获取会员信息
   * @returns {Promise<Object>} 会员信息对象
   * @throws {Error} API调用失败时抛出异常
   * @description 查询VIP会员状态
   */
  async function getCustomerInfoImpl() {
    let client = EzrevenueClient({
      projectId: projectId,
      projectSecret: projectSecret,
    })
    let deviceId = await customerIdGetter()
    let res = await client.call('customer.info', {
      paywall_alias: paywallAlias,
      customer: {
        external_id: deviceId,
      },
      include_balance: true,
    })
    console.log('customerInfo', res)
    return res
  }

  /**
   * 监听来自popup/content script的消息
   * 支持的消息类型:
   * - getCustomerInfo: 获取会员信息
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handlerMap = {
      ezrevenue_customer_info: getCustomerInfo,
    }
    let handlerFunc = handlerMap[request.action]
    if (handlerFunc) {
      handlerFunc(request).then(sendResponse)
      return true
    }
  })
}
