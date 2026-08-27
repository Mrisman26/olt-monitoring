const snmp = require('net-snmp')

const zteOids = {
  onuName: '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.2',
  onuType: '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.1',
  onuSerial: '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.18',
  onuStatus: '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.4',
  onuLastOnline: '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.5',
  onuLastOffline: '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.6',
  onuLastDownReason: '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.7',
  rxPower: '1.3.6.1.4.1.3902.1082.500.20.2.2.2.1.10',
}

const olt = {
  id: 'olt-test',
  name: 'OLT-TS',
}

const session = snmp.createSession('192.168.251.2', 'radbooxro', { version: snmp.Version2c, port: 161, timeout: 10000, retries: 1 })

function valueToText(value) {
  if (Buffer.isBuffer(value)) return value.toString('utf8').replace(/\0/g, '').trim()
  if (value === null || value === undefined) return ''
  return String(value)
}

function opticalScale(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number === -2147483648) return null
  return number / 100
}

function normalizeZteSerial(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const match = text.match(/^\d+,(.*)$/)
  if (match && match[1]) return match[1].trim()
  return text
}

function statusFromZteRunState(runState) {
  const value = String(runState)
  if (value === '4') return 'online'
  return 'offline'
}

function decodeZteIndex(index) {
  const parts = String(index || '').split('.')
  if (parts.length < 2) return { board: 0, pon: 0, onuId: 0 }
  const encoded = Number(parts[0])
  const onuId = Number(parts[1])
  if (!Number.isFinite(encoded) || !Number.isFinite(onuId)) return { board: 0, pon: 0, onuId: 0 }
  const board1Base = 285278464
  const board2Base = 285278720
  if (encoded > board2Base && encoded <= board2Base + 16) {
    return { board: 2, pon: encoded - board2Base, onuId }
  }
  if (encoded > board1Base && encoded <= board1Base + 16) {
    return { board: 1, pon: encoded - board1Base, onuId }
  }
  return { board: 0, pon: 0, onuId: 0 }
}

function assignByColumn(target, rows, baseOid, key, transform = (value) => value) {
  rows.filter((row) => row.oid.startsWith(`${baseOid}.`)).forEach((row) => {
    const index = row.oid.replace(`${baseOid}.`, '')
    if (!target.has(index)) target.set(index, { ontIndex: index })
    const item = target.get(index)
    if (item) item[key] = transform(row.value)
  })
}

function assignOpticalColumn(target, rows, baseOid, key) {
  rows.filter((row) => row.oid.startsWith(`${baseOid}.`)).forEach((row) => {
    const rawIndex = row.oid.replace(`${baseOid}.`, '')
    const parts = rawIndex.split('.')
    const isZteEncoded = parts.length > 2 && Number(parts[0]) >= 100000000
    const index = isZteEncoded ? `${parts[0]}.${parts[1]}` : parts[0]
    const suffix = isZteEncoded ? parts.slice(2).join('.') : parts.slice(1).join('.')
    const isMainReading = suffix === '' || suffix === '0.0' || suffix === '1'
    if (!target.has(index)) target.set(index, { ontIndex: index })
    const item = target.get(index)
    if (item && (isMainReading || item[key] === undefined || item[key] === null)) {
      item[key] = opticalScale(row.value)
    }
  })
}

function mapZteOnus(items) {
  return items.filter((item) => item.name || item.serial || item.runState || item.rxPower !== undefined)
    .map((item) => {
      const idx = decodeZteIndex(item.ontIndex)
      const status = statusFromZteRunState(item.runState)
      const fallbackName = item.serial ? `ONU-${item.serial}` : `ONU-${idx.pon}/${idx.onuId}`
      return {
        id: `${olt.id}-${item.ontIndex}`,
        oltId: olt.id,
        name: item.name || fallbackName,
        serialNumber: item.serial || '-',
        ponPort: String(idx.pon),
        onuIndex: String(idx.onuId),
        status,
        rxPower: item.rxPower ?? 0,
        txPower: item.txPower ?? 0,
        temperatureC: item.temperature ?? null,
        downReason: item.lastDownReason || null,
        distanceMeters: 0,
        lastSeen: 'Baru saja',
        syncStatus: 'synced',
      }
    })
}

function walk(rootOid) {
  return new Promise((resolve, reject) => {
    const rows = []
    session.subtree(rootOid, (varbinds) => {
      if (Array.isArray(varbinds)) {
        for (const vb of varbinds) {
          rows.push({ oid: vb.oid, value: valueToText(vb.value) })
        }
      }
    }, (error) => {
      if (error) reject(error)
      else resolve(rows)
    })
  })
}

;(async () => {
  try {
    const nameRows = await walk(zteOids.onuName)
    const typeRows = await walk(zteOids.onuType)
    const serialRows = await walk(zteOids.onuSerial)
    const statusRows = await walk(zteOids.onuStatus)
    const lastDownRows = await walk(zteOids.onuLastDownReason)
    const lastOnlineRows = await walk(zteOids.onuLastOnline)
    const lastOfflineRows = await walk(zteOids.onuLastOffline)
    const opticalRows = await walk(zteOids.rxPower)

    console.log('counts:', {
      nameRows: nameRows.length,
      typeRows: typeRows.length,
      serialRows: serialRows.length,
      statusRows: statusRows.length,
      lastDownRows: lastDownRows.length,
      lastOnlineRows: lastOnlineRows.length,
      lastOfflineRows: lastOfflineRows.length,
      opticalRows: opticalRows.length,
    })

    const onusByIndex = new Map()
    assignByColumn(onusByIndex, nameRows, zteOids.onuName, 'name')
    assignByColumn(onusByIndex, typeRows, zteOids.onuType, 'model')
    assignByColumn(onusByIndex, serialRows, zteOids.onuSerial, 'serial', normalizeZteSerial)
    assignByColumn(onusByIndex, statusRows, zteOids.onuStatus, 'runState')
    assignByColumn(onusByIndex, lastDownRows, zteOids.onuLastDownReason, 'lastDownReason')
    assignByColumn(onusByIndex, lastOnlineRows, zteOids.onuLastOnline, 'lastOnline')
    assignByColumn(onusByIndex, lastOfflineRows, zteOids.onuLastOffline, 'lastOffline')
    assignOpticalColumn(onusByIndex, opticalRows, zteOids.rxPower, 'rxPower')

    const items = [...onusByIndex.values()]
    console.log('total raw items:', items.length)
    const onus = mapZteOnus(items)
    console.log('mapped onus:', onus.length)
    console.log(JSON.stringify(onus.slice(0, 10), null, 2))
  } catch (err) {
    console.error(err)
  } finally {
    session.close()
  }
})()
