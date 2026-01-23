/**
 * 加密服务模块
 * 提供 AES + RSA 混合加密功能，用于设备授权
 */

import crypto from 'crypto'

// RSA 公钥（用于加密 AES 密钥）
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCF2N9qu5PGd5rheBCMowZ3feEK
dD3y9W8WWa38zF7ddvH4FkMct5kuRY3YpuWCWTpkguuUhe+BcW1EBv6M5D+G0Lfc
MnZ+q0u3lR6DR1ql6h9gtUDEL/WEdELJ8k6NrrdbXsNslU0QeojhjPPS3SQ1ctd3
aNVhbBluBIFxI5LTywIDAQAB
-----END PUBLIC KEY-----`

/**
 * 生成加密后的 open_id
 * 使用 AES-128-ECB 加密数据，RSA 加密 AES 密钥
 *
 * @param {Object} data - 需要加密的数据对象
 * @returns {Object} { success: boolean, openId?: string, error?: string }
 */
export function generateOpenId(data) {
  try {
    const jsonStr = JSON.stringify(data)
    // 生成随机 AES 密钥（16字节 = 128位）
    const aesKey = crypto.randomBytes(16)

    // AES-128-ECB 加密数据
    const cipher = crypto.createCipheriv('aes-128-ecb', aesKey, null)
    cipher.setAutoPadding(true)
    let encrypted = cipher.update(jsonStr, 'utf8')
    encrypted = Buffer.concat([encrypted, cipher.final()])
    const aStr = encrypted.toString('base64')

    // RSA 加密 AES 密钥
    const encryptedKey = crypto.publicEncrypt(
      {
        key: RSA_PUBLIC_KEY,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      aesKey
    )
    const rStr = encryptedKey.toString('base64')

    // 组合成 open_id 格式
    const openId = `${rStr}<>${aStr}`

    // URL 编码
    const encodedOpenId = encodeURIComponent(openId)

    return { success: true, openId: encodedOpenId }
  } catch (error) {
    console.error('[Crypto] 加密失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 验证加密数据格式
 * @param {Object} data - 待加密数据
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateEncryptData(data) {
  const requiredFields = ['tenantId', 'deviceId', 'deviceType', 'deviceModel']
  const missingFields = requiredFields.filter((field) => !data[field])

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `缺少必要字段: ${missingFields.join(', ')}`
    }
  }

  return { valid: true }
}
