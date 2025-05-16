// background.js
import { ezrevenueProjectId, ezrevenueProjectSecret } from './config.js'
import { EzrevenueClient } from './lib/ezrevenue.js'
import { generateDeviceUniqueId } from './lib/stringRandom.js'

// 监听来自其他部分的插件（如 Popup）的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)
  if (request.action === 'getImagesFromTab') {
    return getImagesFromTab({ sendResponse })
  } else if (request.action === 'downloadImages') {
    return downloadImages({ request, sendResponse })
  } else if (request.action === 'getVipInfo') {
    return getVipInfo({ request, sendResponse })
  }
})

function getImagesFromTab({ sendResponse }) {
  // 获取当前活动的标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const currentTab = tabs[0]
      // 在当前标签页执行 Content Script
      // 白名单检查 - 只允许http/https/ftp等网页协议
      if (!currentTab.url || !/^(http|https|ftp):\/\//i.test(currentTab.url)) {
        sendResponse({ success: false, error: '不支持在此类型页面执行脚本' })
        return true
      }

      chrome.scripting
        .executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js'],
        })
        .then((results) => {
          // 获取content.js返回的图片URL数组
          const imageUrls = results[0].result
          console.log('Images found:', imageUrls)
          // 将结果发送回Popup
          sendResponse({ success: true, urls: imageUrls })
        })
        .catch((error) => {
          console.error('Error executing content script:', error)
          sendResponse({
            success: false,
            error: '无法获取图片: ' + (error.message || '未知错误'),
          })
        })
    }
  })
  // 保持异步响应通道开放
  return true // 允许后续异步响应
}

function downloadImages({ request, sendResponse }) {
  const imageUrls = request.urls
  console.log('Received download request for:', imageUrls)

  imageUrls.forEach((url) => {
    // 使用 chrome.downloads.download API 下载图片
    chrome.downloads.download(
      {
        url: url,
        // 可选：指定文件名或其他选项
        // filename: 'images/' + url.substring(url.lastIndexOf('/') + 1),
        saveAs: false, // 设置为 false，浏览器会直接下载到默认位置，不会弹出保存对话框
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed for:', url, chrome.runtime.lastError)
          // 可以在这里向 Popup 发送下载失败的提示
        } else {
          console.log('Download started with ID:', downloadId, 'for URL:', url)
          // 可以在这里向 Popup 发送下载成功的提示
          sendResponse({ success: true })
        }
      }
    )
  })
  // 下载是异步操作，保持通道开放
  return true
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
function getVipInfo({ sendResponse }) {
  getVipInfoAsync()
    .then((vipInfo) => {
      sendResponse({
        success: true,
        data: vipInfo,
      })
    })
    .catch((err) => {
      sendResponse({
        success: false,
        error: err,
      })
    })
  return true
}

async function getVipInfoAsync() {
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
