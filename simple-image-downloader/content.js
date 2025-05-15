// content.js

// 查找页面上所有的 img 标签
const images = document.querySelectorAll('img');
const imageUrls = [];

images.forEach(img => {
  // img.src 属性通常会返回绝对 URL，即使原始 HTML 中是相对路径
  if (img.src) {
    imageUrls.push(img.src);
  }
});

// 将图片 URL 列表发送回 Popup Script 或 Background Script
// 这里选择发送给 Popup Script，因为是 Popup 触发了 Content Script 的执行
// 使用 chrome.runtime.sendMessage 或 chrome.tabs.sendMessage
// 在 activeTab + scripting 的模式下，由 popup.js 触发 content.js 执行，
// content.js 执行完毕后，通常是向 popup.js 发送结果。
// 注意：直接从 Content Script 给 Popup 发消息比较直接，但在 Manifest V3 中，
// 推荐由 Popup 或 Background 发起脚本注入后，脚本执行完毕自动返回结果，或者脚本再主动发送消息。
// 我们在这里让 content.js 主动发消息给 Popup。

chrome.runtime.sendMessage({
  action: "displayImages",
  urls: imageUrls
});

console.log("Image URLs found:", imageUrls); // 可以在开发者工具的控制台看到
