const snmp = require('net-snmp');
const session = snmp.createSession('192.168.251.2', 'server', { version: snmp.Version2c, port: 161, timeout: 10000, retries: 1 });

function fmt(value) {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value.toString('utf8').replace(/\0/g, '');
  return value;
}

async function getOne(oid) {
  return new Promise((resolve, reject) => {
    session.get([oid], (err, varbinds) => {
      if (err) return reject(err);
      resolve(varbinds.map((vb) => ({ oid: vb.oid, type: vb.type, value: fmt(vb.value) })));
    });
  });
}

async function walkRoot(root) {
  return new Promise((resolve, reject) => {
    const rows = [];
    session.subtree(
      root,
      (varbinds) => {
        if (Array.isArray(varbinds)) {
          rows.push(...varbinds.map((vb) => ({ oid: vb.oid, type: vb.type, value: fmt(vb.value) })));
        }
      },
      (err) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

(async () => {
  const sampleOid = '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.2.285278728.13';
  console.log('GET OID', sampleOid);
  try {
    const getRows = await getOne(sampleOid);
    console.log('GET result', JSON.stringify(getRows, null, 2));
  } catch (err) {
    console.error('GET error', err);
  }

  const roots = [
    '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.2',
    '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.1',
    '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.18',
    '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.4',
  ];

  for (const root of roots) {
    console.log('\nWALK root', root);
    try {
      const rows = await walkRoot(root);
      console.log('walk rows', rows.length);
      console.log(JSON.stringify(rows.slice(0, 20), null, 2));
    } catch (err) {
      console.error('walk error', err);
    }
  }

  session.close();
})();
