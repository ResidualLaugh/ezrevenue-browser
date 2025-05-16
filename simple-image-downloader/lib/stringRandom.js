export function generateRandomString(length) {
  let ret = ''
  while (ret.length < length) {
    // Generate a random number, convert to base 36, remove the '0.' prefix
    let value = Math.random().toString(36).substring(2)
    ret += value
  }
  return ret.substring(0, length)
}

export function generateDeviceUniqueId() {
  // Current timestamp in milliseconds converted to base 36
  const timestampPart = Date.now().toString(36)
  const randomPart = generateRandomString(22)
  return `${timestampPart}${randomPart}`
}
