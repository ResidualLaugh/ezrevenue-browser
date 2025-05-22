/**
 * 后台服务主模块
 * 职责：
 * 1. 消息路由和处理
 * 2. 图片获取和下载
 *
 * @module background
 */
import { registerEzrevenueBackground } from './ezrevenue-sdk/background.js'

// 注册艺爪付费会员service-worker服务
registerEzrevenueBackground({
  projectId: '7hm9hwpgny3sa',
  projectSecret: 'z2xfu7urzqqrysu3bk0hg72yhsnpt3ux',
})

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
