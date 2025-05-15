// content.js

// 查找页面上所有的 img 标签并去重
const images = document.querySelectorAll('img');
const imageUrls = [...new Set(
  Array.from(images)
    .map(img => img.src)
    .filter(src => src && !src.startsWith('data:'))
)];

// 直接返回图片URL数组作为脚本执行结果
imageUrls;
