// background.js

// 监听来自其他部分的插件（如 Popup）的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);

  if (request.action === "getImagesFromTab") {
    // 获取当前活动的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        // 在当前标签页执行 Content Script
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js'] // 要注入的 Content Script 文件
        }).then((results) => {
           // executeScript 成功后，results 是一个数组，每个元素的 result 属性是 Content Script 中最后的表达式的值
           // 然而，我们的 content.js 是通过 chrome.runtime.sendMessage 发送消息的，
           // 所以这里不需要处理 results。
           console.log("Content script executed.");
           // Content script 会自行发送消息给 popup
        }).catch(error => {
            console.error("Error executing content script:", error);
             // 可以在这里向 Popup 发送错误消息
             chrome.tabs.sendMessage(currentTab.id, { action: "error", message: "Could not retrieve images." });
        });
      }
    });
    // executeScript 是异步的，不需要立即 sendResponse
    return true; // 表示将异步发送响应 (虽然这里没有显式发送)
  } else if (request.action === "downloadImages") {
    const imageUrls = request.urls;
    console.log("Received download request for:", imageUrls);

    imageUrls.forEach(url => {
      // 使用 chrome.downloads.download API 下载图片
      chrome.downloads.download({
        url: url,
        // 可选：指定文件名或其他选项
        // filename: 'images/' + url.substring(url.lastIndexOf('/') + 1),
        saveAs: false // 设置为 false，浏览器会直接下载到默认位置，不会弹出保存对话框
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download failed for:", url, chrome.runtime.lastError);
          // 可以在这里向 Popup 发送下载失败的提示
        } else {
          console.log("Download started with ID:", downloadId, "for URL:", url);
          // 可以在这里向 Popup 发送下载成功的提示
        }
      });
    });
    return true; // 表示将异步发送响应
  }
});
