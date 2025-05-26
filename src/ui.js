import browser from 'webextension-polyfill'

export function createEzrevenueService() {
  function defineAction(action) {
    async function actionHandler(params) {
      const response = await browser.runtime.sendMessage({
        action: `ezrevenue_${action}`,
        data: params || {},
      })
      console.log('ezrevenue response:', response)
      return response
    }
    return { [action]: actionHandler }
  }
  const self = {
    ...defineAction('getCustomerId'),
    ...defineAction('getCustomerInfo'),
    ...defineAction('showPaywallPopup'),
    ...defineAction('isBalanceUsable'),
  }
  return self
}

;(function () {
  if (typeof window !== undefined) {
    window.createEzrevenueService = createEzrevenueService
  }
})()
