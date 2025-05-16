// background.js
import { ezrevenueProjectId, ezrevenueProjectSecret } from './config.js'
import { EzrevenueClient } from './lib/ezrevenue.js'
import { generateDeviceUniqueId } from './lib/stringRandom.js'

// 监听来自其他部分的插件（如 Popup）的消息
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

// 获取设备ID
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

// 获取会员信息
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

// 调用艺爪付费接口获取会员信息
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
