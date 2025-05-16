/**
 * 内容脚本 - 从网页提取图片URL
 * @module content
 * @description 查找页面上所有img标签，过滤掉data URL和非http(s)/ftp协议的图片
 */
;(function () {
  // 查找页面上所有img标签，过滤并去重：
  // 1. 排除data URL(base64编码的图片)
  // 2. 只保留http/https/ftp协议的图片
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
