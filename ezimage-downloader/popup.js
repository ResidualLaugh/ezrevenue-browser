/**
 * 弹出页面主模块
 * 职责：
 * 1. 图片展示和交互
 * 2. 会员状态管理
 * 3. 支付界面弹窗控制
 *
 * @module popup
 */
const vipService = createEzrevenueService()

const imageGrid = document.getElementById('image-grid')
const errorView = document.getElementById('error-view')
const downloadAllButton = document.getElementById('download-all')
const vipButton = document.getElementById('vip-button')
let allImageUrls = []

// 会员按钮点击事件
vipButton.addEventListener('click', async () => {
  try {
    await vipService.showPaywallPopup()
    await displayVipInfo()
  } catch (error) {
    console.error('Error:', error)
    errorView.innerHTML = `<p class="error">${error.message}</p>`
  }
})

// 当 Popup 加载时，通知 Background Script 去 Content Script 中获取图片
document.addEventListener('DOMContentLoaded', async () => {
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
  try {
    await displayVipInfo()
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

/**
 * 更新会员状态显示
 * @description 根据会员状态更新按钮文字(VIP/非VIP)
 */
async function displayVipInfo() {
  let isVip = await vipService.isBalanceUsable()
  if (isVip) {
    vipButton.innerText = '我的会员'
    downloadAllButton.innerText = '全部下载(VIP)'
  } else {
    vipButton.innerText = '开通会员'
    downloadAllButton.innerText = '全部下载(开通VIP)'
  }
}

// 下载全部图片
downloadAllButton.addEventListener('click', async () => {
  let isVip = await vipService.isBalanceUsable()
  if (!isVip) {
    await vipService.showPaywallPopup()
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
