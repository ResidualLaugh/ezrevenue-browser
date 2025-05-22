import { SignJWT, jwtVerify } from 'jose'
import { generateRandomString } from './stringRandom.js'

export function EzrevenueClient({ projectId, projectSecret }) {
  const BASE_URL = 'https://revenue.ezboti.com/api/v1/server'
  const self = {
    async decodeToken(token) {
      const secret = new TextEncoder().encode(projectSecret)
      const { payload } = await jwtVerify(token, secret)
      return payload.result
    },
    async encodeToken(payload) {
      payload.exp = Date.now() + 30 * 60 // 过期时间，建议当前时间+30分钟
      payload.nonce = generateRandomString(16) // 随机字符串，32个字符以内
      const secret = new TextEncoder().encode(projectSecret)
      const jwt = new SignJWT(payload).setProtectedHeader({
        alg: 'HS256',
        project_id: projectId,
      })
      const token = await jwt.sign(secret)
      return token
    },
    sendRequest({ url, content }) {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: content,
      })
    },
    async call(api, params) {
      const token = await self.encodeToken({ method: api, params: params })
      const url = BASE_URL + '/' + api
      try {
        let response = await self.sendRequest({ url, content: token })
        let text = await response.text()
        return await self.decodeToken(text)
      } catch (error) {
        if (error.response) {
          const { status, data } = error.response
          console.log(`${api} failed status=${status}, body ==>`, data)
        }
        throw error
      }
    },
  }
  return self
}
