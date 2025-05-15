// content.js

;(function () {
  // 查找页面上所有的 img 标签并去重
  const images = document.querySelectorAll('img')
  if (!images || images.length === 0) return []

  const imageUrls = [
    ...new Set(
      Array.from(images)
        .map((img) => img.src)
        .filter((src) => src && 
          !src.startsWith('data:') && 
          (src.startsWith('http:') || src.startsWith('https:'))
        )
    ),
  ]

  // 直接返回图片URL数组作为脚本执行结果
  return imageUrls
})()
