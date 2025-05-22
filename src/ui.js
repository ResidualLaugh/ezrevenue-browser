function createEzrevenueService() {
  const self = {
    async getCustomerInfo() {
      return await getCustomerInfo()
    },
    async showPaywallPopup() {
      let info = await self.getCustomerInfo()
      await showPaywallPopup(info)
    },
    async isBalanceUsable({ equityId, equityAlias } = {}) {
      let info = await self.getCustomerInfo()
      let vipBalance = info.balance_s.find((x) => {
        if (equityId) {
          return x.equity.id === equityId
        } else {
          return x.equity.alias === equityAlias || 'equity_vip'
        }
      })
      return vipBalance?.is_balance_usable
    },
  }
  return self
}

/**
 * 获取会员信息
 * https://www.ezboti.com/docs/revenue/api-customer-info/
 * @async
 * @param {Object} [params] 可选参数
 * @param {boolean} [params.refresh] 是否强制刷新
 * @returns {Promise<Object>} 会员信息对象
 * @throws {Error} 获取失败时抛出异常
 */
async function getCustomerInfo(params) {
  const response = await chrome.runtime.sendMessage({
    action: 'ezrevenue_customer_info',
    ...(params || {}),
  })
  console.log('getCustomerInfo response', response)
  if (response && response.success) {
    let vipInfo = response.data
    return vipInfo
  } else {
    const errorMsg = response?.error || '获取会员信息失败'
    console.info('Error:', errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * 显示支付界面弹窗
 * @async
 * @param {Object} vipInfo 会员信息
 * @param {Object} vipInfo.home_link 支付界面链接信息
 * @description 居中显示800x600的支付界面窗口，关闭后刷新会员状态
 */
async function showPaywallPopup(vipInfo) {
  let paywallUrl = vipInfo.home_link.url
  if (!paywallUrl) {
    return
  }
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
  return await new Promise((resolve) => {
    const handler = async (windowId) => {
      if (windowId === myPopupId) {
        chrome.windows.onRemoved.removeListener(handler)
        let vipInfo = await getCustomerInfo({ refresh: true })
        resolve(vipInfo)
      }
    }
    chrome.windows.onRemoved.addListener(handler)
  })
}

window.createEzrevenueService = createEzrevenueService
