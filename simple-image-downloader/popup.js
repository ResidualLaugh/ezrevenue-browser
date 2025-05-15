// popup.js
const imageGrid = document.getElementById('image-grid')
const errorView = document.getElementById('error-view')
const downloadAllButton = document.getElementById('download-all')
const vipButton = document.getElementById('vip-button')
let allImageUrls = []

// 会员按钮点击事件
vipButton.addEventListener('click', () => {
  chrome.windows.create({
    url: 'https://www.ezboti.com',
    type: 'popup',
    width: 400,
    height: 600,
    left: Math.round((screen.width - 400) / 2),
    top: Math.round((screen.height - 600) / 2),
  })
})

// 当 Popup 加载时，通知 Background Script 去 Content Script 中获取图片
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ action: 'getImagesFromTab' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError)
      errorView.innerHTML = `<p class="error">${chrome.runtime.lastError.message}</p>`
      return
    }

    if (response && response.success) {
      allImageUrls = response.urls
      displayImages(response.urls)
    } else {
      const errorMsg = response?.error || '获取图片失败'
      console.info('Error:', errorMsg)
      errorView.innerHTML = `<p class="error">${errorMsg}</p>`
    }
  })
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
    img.onerror = () => {
      img.src = 'placeholder.png'
    }

    // 点击单张图片下载
    itemDiv.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'downloadImages',
        urls: [url],
      })
    })

    itemDiv.appendChild(img)
    imageGrid.appendChild(itemDiv)
  })
}

// 下载全部图片
if (downloadAllButton) {
  downloadAllButton.addEventListener('click', () => {
    if (allImageUrls.length > 0) {
      chrome.runtime.sendMessage({
        action: 'downloadImages',
        urls: allImageUrls,
      })
    } else {
      alert('当前页面没有可下载的图片')
    }
  })
}
