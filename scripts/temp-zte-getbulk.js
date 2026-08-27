const snmp = require('net-snmp')

const session = snmp.createSession('192.168.251.2', 'radbooxro', { version: snmp.Version2c, port: 161, timeout: 10000, retries: 1 })
const rootOid = '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.2'

function oidCompare(a, b) {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? -1
    const rightValue = right[index] ?? -1
    if (leftValue !== rightValue) return leftValue - rightValue
  }
  return 0
}

function isInSubtree(oid, rootOid) {
  return oid === rootOid || oid.startsWith(`${rootOid}.`)
}

function valueToText(value) {
  if (Buffer.isBuffer(value)) {
    const text = value.toString('utf8').replace(/\0/g, '').trim()
    return /^[\x20-\x7E\r\n\t]*$/.test(text) ? text : value.toString('hex').toUpperCase()
  }
  if (value === null || value === undefined) return ''
  return String(value)
}

async function walk() {
  const rows = []
  let cursor = rootOid
  while (rows.length < 2000) {
    const varbinds = await new Promise((resolve, reject) => {
      session.getBulk([cursor], 0, 25, (error, result) => {
        if (error) reject(error)
        else resolve(result)
      })
    })
    const list = Array.isArray(varbinds[0]) ? varbinds[0] : varbinds
    let moved = false
    for (const varbind of list) {
      if (!varbind?.oid || !isInSubtree(varbind.oid, rootOid)) return rows
      if (oidCompare(varbind.oid, cursor) <= 0) continue
      if (!snmp.isVarbindError(varbind)) {
        rows.push({ oid: varbind.oid, value: valueToText(varbind.value) })
      }
      cursor = varbind.oid
      moved = true
      if (rows.length >= 2000) return rows
    }
    if (!moved) return rows
  }
  return rows
}

;(async () => {
  try {
    const rows = await walk()
    console.log('walk rows', rows.length)
    console.log(rows.slice(0, 10))
  } catch (err) {
    console.error(err)
  } finally {
    session.close()
  }
})()
