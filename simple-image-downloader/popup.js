// popup.js
const imageGrid = document.getElementById('image-grid');
const downloadAllButton = document.getElementById('download-all');
let allImageUrls = [];

// 当 Popup 加载时，通知 Background Script 去 Content Script 中获取图片
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ action: "getImagesFromTab" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      imageGrid.innerHTML = `<p class="error">${chrome.runtime.lastError.message}</p>`;
      return;
    }
    
    if (response && response.success) {
      allImageUrls = response.urls;
      displayImages(response.urls);
    } else {
      const errorMsg = response?.error || '获取图片失败';
      console.error('Error:', errorMsg);
      imageGrid.innerHTML = `<p class="error">${errorMsg}</p>`;
    }
  });
});

function displayImages(urls) {
  if (!imageGrid || !imageGrid.innerHTML) return;
  
  imageGrid.innerHTML = ''; // 清空加载提示
  
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    imageGrid.innerHTML = '<p>当前页面没有找到图片</p>';
    return;
  }

  urls.forEach(url => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'image-item';

    const img = document.createElement('img');
    img.src = url;
    img.alt = '图片预览';
    img.onerror = () => { img.src = 'placeholder.png'; };

    // 点击单张图片下载
    itemDiv.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: "downloadImages",
        urls: [url]
      });
    });

    itemDiv.appendChild(img);
    imageGrid.appendChild(itemDiv);
  });
}

// 下载全部图片
downloadAllButton.addEventListener('click', () => {
  if (allImageUrls.length > 0) {
    chrome.runtime.sendMessage({
      action: "downloadImages",
      urls: allImageUrls
    });
  } else {
    alert("当前页面没有可下载的图片");
  }
});
