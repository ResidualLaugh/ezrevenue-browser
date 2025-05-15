// popup.js
const imageListDiv = document.getElementById('image-list');
const downloadButton = document.getElementById('download-selected');

// 当 Popup 加载时，通知 Background Script 去 Content Script 中获取图片
document.addEventListener('DOMContentLoaded', () => {
  // 告知 Background Script 获取当前 Tab 的 ID，并在该 Tab 执行 Content Script
  chrome.runtime.sendMessage({ action: "getImagesFromTab" });
});

// 监听来自 Background Script 或 Content Script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "displayImages") {
    displayImages(request.urls);
  }
});

function displayImages(urls) {
  imageListDiv.innerHTML = ''; // 清空加载提示
  if (urls.length === 0) {
    imageListDiv.innerHTML = '<p>No images found on this page.</p>';
    return;
  }

  urls.forEach(url => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'image-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = url; // 将 URL 作为 checkbox 的值

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Image preview';
    // 添加错误处理，防止图片加载失败导致弹窗卡顿
    img.onerror = () => { img.src = 'placeholder.png'; }; // 可以用一个本地的占位符图片代替

    const urlSpan = document.createElement('span');
    urlSpan.textContent = url;
    urlSpan.title = url; // 鼠标悬停显示完整 URL

    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(img);
    itemDiv.appendChild(urlSpan);

    imageListDiv.appendChild(itemDiv);
  });
}

// 处理下载按钮点击事件
downloadButton.addEventListener('click', () => {
  const checkboxes = imageListDiv.querySelectorAll('input[type="checkbox"]:checked');
  const selectedUrls = [];

  checkboxes.forEach(checkbox => {
    selectedUrls.push(checkbox.value);
  });

  if (selectedUrls.length > 0) {
    // 将选中的图片 URL 列表发送给 Background Service Worker 进行下载
    chrome.runtime.sendMessage({
      action: "downloadImages",
      urls: selectedUrls
    });
    // 可选：关闭弹窗或给出提示
    // window.close();
  } else {
    alert("Please select at least one image to download.");
  }
});
