/**
 * 弹出页面主模块
 * 职责：
 * 1. 图片展示和交互
 * 2. 下载功能控制
 * 3. 会员状态管理
 *
 * @module popup
 */

// 初始化会员服务
const vipService = createEzrevenueService()
async function showPaywallPopup() {
  return await vipService.showPaywallPopup({
    screenWidth: screen.width,
    screenHeight: screen.height,
  })
}

const vipButton = document.getElementById('vip-button')

// 更新会员状态显示
async function updateVipStatus() {
  const isVip = await vipService.isBalanceUsable()
  vipButton.innerText = isVip ? '我的会员' : '开通会员'
  downloadAllButton.innerText = isVip ? '下载全部(VIP)' : '下载全部(开通会员)'
}

const imageGrid = document.getElementById('image-grid')
const errorView = document.getElementById('error-view')
const downloadAllButton = document.getElementById('download-all')
let allImageUrls = []

// 会员按钮点击事件
vipButton.addEventListener('click', async () => {
  await showPaywallPopup()
  await updateVipStatus()
})

// 当 Popup 加载时，初始化会员状态并获取图片
document.addEventListener('DOMContentLoaded', async () => {
  await updateVipStatus()
  try {
    const imagesResponse = await chrome.runtime.sendMessage({
      action: 'getImagesFromTab',
    })
    if (imagesResponse && imagesResponse.success) {
      allImageUrls = imagesResponse.urls
      displayImages(imagesResponse.urls)
    } else {
      const errorMsg = imagesResponse?.error || '获取图片失败'
      console.info('Error:', errorMsg)
      errorView.innerHTML = `<p class="error">${errorMsg}</p>`
    }
  } catch (error) {
    console.error('Error:', error)
    errorView.innerHTML = `<p class="error">${error.message}</p>`
  }
})

/**
 * 展示图片网格
 * @param {Array<string>} urls 图片URL数组
 * @description 将图片以网格形式展示，点击单张图片可下载
 */
function displayImages(urls) {
  if (!imageGrid) return

  // 清空加载提示
  imageGrid.innerHTML = ''
  errorView.innerHTML = ''

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    errorView.innerHTML = '<p>当前页面没有找到图片</p>'
    return
  }

  urls.forEach((url) => {
    const itemDiv = document.createElement('div')
    itemDiv.className = 'image-item'

    const img = document.createElement('img')
    img.src = url
    img.alt = '图片预览'

    // 点击单张图片下载
    itemDiv.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({
          action: 'downloadImages',
          urls: [url],
        })
      } catch (error) {
        console.error('Download failed:', error)
      }
    })

    itemDiv.appendChild(img)
    imageGrid.appendChild(itemDiv)
  })
}

// 下载全部图片
downloadAllButton.addEventListener('click', async () => {
  // 先检查会员状态
  const isVip = await vipService.isBalanceUsable()
  if (!isVip) {
    await showPaywallPopup()
    await updateVipStatus()
    return
  }
  if (allImageUrls.length <= 0) {
    alert('当前页面没有可下载的图片')
    return
  }
  try {
    await chrome.runtime.sendMessage({
      action: 'downloadImages',
      urls: allImageUrls,
    })
  } catch (error) {
    console.error('Download failed:', error)
    alert('下载失败: ' + error.message)
  }
})
