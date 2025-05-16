// popup.js
const imageGrid = document.getElementById('image-grid')
const errorView = document.getElementById('error-view')
const downloadAllButton = document.getElementById('download-all')
const vipButton = document.getElementById('vip-button')
let allImageUrls = []

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
