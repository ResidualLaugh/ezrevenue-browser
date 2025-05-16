/**
 * 后台服务主模块
 * 职责：
 * 1. 消息路由和处理
 * 2. 图片获取和下载
 * 3. 会员信息服务
 * 
 * @module background
 */
import { ezrevenueProjectId, ezrevenueProjectSecret } from './config.js'
import { EzrevenueClient } from './lib/ezrevenue.js'
import { generateDeviceUniqueId } from './lib/stringRandom.js'

/**
 * 监听来自popup/content script的消息
 * 支持的消息类型:
 * - getImagesFromTab: 从当前标签页获取图片
 * - downloadImages: 下载指定图片
 * - getVipInfo: 获取会员信息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)
  const handlerMap = {
    getImagesFromTab: getImagesFromTab,
    downloadImages: downloadImages,
    getVipInfo: getVipInfo,
  }
  let handlerFunc = handlerMap[request.action]
  if (handlerFunc) {
    handlerFunc(request).then(sendResponse)
    return true
  }
})

/**
 * 从当前活动标签页获取所有图片URL
 * @async
 * @returns {Promise<Object>} 返回结果对象包含:
 *   - success: boolean 是否成功
 *   - urls: Array<string> 图片URL数组(成功时)
 *   - error: string 错误信息(失败时)
 * @throws {Error} 执行内容脚本时可能抛出异常
 */
async function getImagesFromTab() {
  try {
    // 获取当前活动的标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length === 0) {
      return { success: false, error: 'No active tab found' }
    }

    const currentTab = tabs[0]
    // 白名单检查 - 只允许http/https/ftp等网页协议
    if (!currentTab.url || !/^(http|https|ftp):\/\//i.test(currentTab.url)) {
      return { success: false, error: '不支持在此类型页面执行脚本' }
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js'],
    })

    // 获取content.js返回的图片URL数组
    const imageUrls = results[0].result
    console.log('Images found:', imageUrls.length)
    return { success: true, urls: imageUrls }
  } catch (error) {
    console.error('Error executing content script:', error)
    return {
      success: false,
      error: '无法获取图片: ' + (error.message || '未知错误'),
    }
  }
}

/**
 * 并发下载多个图片
 * @async
 * @param {Object} request 请求对象
 * @param {Array<string>} request.urls 要下载的图片URL数组
 * @returns {Promise<Object>} 返回结果对象包含:
 *   - success: boolean 是否全部下载成功
 *   - error: string 错误信息(失败时)
 * @throws {Error} 下载过程中可能抛出异常
 */
async function downloadImages(request) {
  const imageUrls = request.urls
  console.log('Received download request for:', imageUrls)

  try {
    await Promise.all(
      imageUrls.map(async (url) => {
        const downloadId = await chrome.downloads.download({
          url: url,
          saveAs: false,
        })
        console.log('Download started with ID:', downloadId, 'for URL:', url)
      })
    )
    return { success: true }
  } catch (error) {
    console.error('Download failed:', error)
    return {
      success: false,
      error: error.message || 'Download failed',
    }
  }
}

const DEVICE_ID_STORAGE_KEY = 'extensionDeviceId'

/**
 * 获取或生成设备唯一ID
 * @async
 * @returns {Promise<string>} 设备唯一ID
 * @description 优先从chrome.storage.local读取设备ID，不存在则生成新ID并存储
 */
async function getOrCreateDeviceId() {
  const data = await chrome.storage.local.get(DEVICE_ID_STORAGE_KEY)
  let deviceId = data[DEVICE_ID_STORAGE_KEY]
  if (!deviceId) {
    deviceId = generateDeviceUniqueId()
    console.log(`create deviceId ${deviceId}`)
    await chrome.storage.local.set({ [DEVICE_ID_STORAGE_KEY]: deviceId })
  } else {
    console.log(`get deviceId ${deviceId}`)
  }
  return deviceId
}

// 暂存会员信息
const state = {
  vipInfo: null,
  lastChecked: null,
}

/**
 * 获取会员信息(外层包装)
 * @async
 * @param {Object} request 请求参数
 * @param {boolean} [request.refresh] 是否强制刷新
 * @returns {Promise<Object>} 返回结果对象包含:
 *   - success: boolean 是否成功
 *   - data: Object 会员信息(成功时)
 *   - error: string 错误信息(失败时)
 */
async function getVipInfo(request) {
  try {
    const vipInfo = await getVipInfoAsync(request)
    return {
      success: true,
      data: vipInfo,
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
 * @async
 * @param {Object} request 请求参数
 * @param {boolean} [request.refresh] 是否强制刷新
 * @returns {Promise<Object>} 会员信息对象
 * @description 缓存有效期30分钟，过期或强制刷新时重新获取
 */
async function getVipInfoAsync(request) {
  if (request.refresh) {
    state.vipInfo = null
    state.lastChecked = null
  }
  if (state.vipInfo) {
    let lastChecked = state.lastChecked
    let isExpired = Date.now() - lastChecked > 30 * 60 * 1000
    if (!lastChecked || isExpired) {
      state.vipInfo = null
      state.lastChecked = null
    }
  }
  if (!state.vipInfo) {
    state.vipInfo = await getVipInfoImpl()
    state.lastChecked = Date.now()
  }
  return state.vipInfo
}

/**
 * 调用艺爪API获取会员信息
 * @async
 * @returns {Promise<Object>} 会员信息对象
 * @throws {Error} API调用失败时抛出异常
 * @description 使用设备ID作为外部用户标识，查询VIP会员状态
 */
async function getVipInfoImpl() {
  let client = EzrevenueClient({
    projectId: ezrevenueProjectId,
    projectSecret: ezrevenueProjectSecret,
  })
  let deviceId = await getOrCreateDeviceId()
  let res = await client.call('customer.info', {
    paywall_alias: 'paywall_vip',
    customer: {
      external_id: deviceId,
    },
    include_balance: true,
  })
  console.log('vipInfo', res)
  return res
}
