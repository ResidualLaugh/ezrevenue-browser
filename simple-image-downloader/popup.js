/**
 * 弹出页面主模块
 * 职责：
 * 1. 图片展示和交互
 * 2. 会员状态管理
 * 3. 支付界面弹窗控制
 *
 * @module popup
 */
const imageGrid = document.getElementById('image-grid')
const errorView = document.getElementById('error-view')
const downloadAllButton = document.getElementById('download-all')
const vipButton = document.getElementById('vip-button')
let allImageUrls = []

/**
 * 获取会员信息
 * https://www.ezboti.com/docs/revenue/api-customer-info/
 * @async
 * @param {Object} [params] 可选参数
 * @param {boolean} [params.refresh] 是否强制刷新
 * @returns {Promise<Object>} 会员信息对象
 * @throws {Error} 获取失败时抛出异常
 */
async function getVipInfo(params) {
  const response = await chrome.runtime.sendMessage({
    action: 'getVipInfo',
    ...(params || {}),
  })
  console.log('getVipInfo response', response)
  if (response && response.success) {
    let vipInfo = response.data
    return vipInfo
  } else {
    const errorMsg = response?.error || '获取会员信息失败'
    console.info('Error:', errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * 显示支付界面弹窗
 * @async
 * @param {Object} vipInfo 会员信息
 * @param {Object} vipInfo.home_link 支付界面链接信息
 * @description 居中显示800x600的支付界面窗口，关闭后刷新会员状态
 */
async function showPaywallPopup(vipInfo) {
  let paywallUrl = vipInfo.home_link.url
  if (paywallUrl) {
    const popup = await chrome.windows.create({
      url: paywallUrl,
      type: 'popup',
      width: 800,
      height: 600,
      left: Math.round((screen.width - 800) / 2),
      top: Math.round((screen.height - 600) / 2),
    })
    const myPopupId = popup.id
    console.log(`Window created with ID: ${myPopupId}`)
    const handler = async (windowId) => {
      if (windowId === myPopupId) {
        chrome.windows.onRemoved.removeListener(handler)
        let vipInfo = await getVipInfo({ refresh: true })
        displayVipInfo(vipInfo)
      }
    }
    chrome.windows.onRemoved.addListener(handler)
  }
}

// 会员按钮点击事件
vipButton.addEventListener('click', async () => {
  try {
    let vipInfo = await getVipInfo()
    showPaywallPopup(vipInfo)
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
    let vipInfo = await getVipInfo()
    displayVipInfo(vipInfo)
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

function isBalanceUsable(vipInfo) {
  let vipBalance = vipInfo.balance_s.find(
    (x) => x.equity.alias === 'equity_vip'
  )
  return vipBalance?.is_balance_usable
}

/**
 * 更新会员状态显示
 * @param {Object} vipInfo 会员信息
 * @description 根据会员状态更新按钮文字(VIP/非VIP)
 */
function displayVipInfo(vipInfo) {
  if (isBalanceUsable(vipInfo)) {
    vipButton.innerText = '我的会员'
    downloadAllButton.innerText = '全部下载(VIP)'
  } else {
    vipButton.innerText = '开通会员'
    downloadAllButton.innerText = '全部下载(开通VIP)'
  }
}

// 下载全部图片
downloadAllButton.addEventListener('click', async () => {
  let vipInfo = await getVipInfo()
  if (!isBalanceUsable(vipInfo)) {
    showPaywallPopup(vipInfo)
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
