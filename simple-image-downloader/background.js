// background.js

// 监听来自其他部分的插件（如 Popup）的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)

  if (request.action === 'getImagesFromTab') {
    // 获取当前活动的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentTab = tabs[0]
        // 在当前标签页执行 Content Script
        chrome.scripting
          .executeScript({
            target: { tabId: currentTab.id },
            files: ['content.js'], // 要注入的 Content Script 文件
          })
          .then((results) => {
            // 获取content.js返回的图片URL数组
            const imageUrls = results[0].result;
            console.log('Images found:', imageUrls);
            // 将结果发送回Popup
            sendResponse({success: true, urls: imageUrls});
          })
          .catch((error) => {
            console.error('Error executing content script:', error)
            sendResponse({success: false, error: 'Could not retrieve images.'})
          })
      }
    })
    // 保持异步响应通道开放
    return true // 允许后续异步响应
  } else if (request.action === 'downloadImages') {
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
            console.log(
              'Download started with ID:',
              downloadId,
              'for URL:',
              url
            )
            // 可以在这里向 Popup 发送下载成功的提示
          }
        }
      )
    })
    // 下载是异步操作，保持通道开放
    return true
  }
})
