const snmp = require('net-snmp');
const session = snmp.createSession('192.168.251.2', 'server', { version: snmp.Version2c, port: 161, timeout: 10000, retries: 1 });

function fmt(value) {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value.toString('utf8').replace(/\0/g, '');
  return value;
}

function walkRoot(root) {
  return new Promise((resolve, reject) => {
    const rows = [];
    session.subtree(root, (varbinds) => {
      if (!Array.isArray(varbinds)) return;
      for (const vb of varbinds) {
        rows.push({ oid: vb.oid, type: vb.type, value: fmt(vb.value) });
      }
    }, (error) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

(async () => {
  try {
    const roots = [
      '1.3.6.1.4.1.3902.1082.500.20.2.2.2.1.10',
      '1.3.6.1.4.1.3902.1082.500.10.2.3.10.1.2',
      '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.5',
      '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.6',
    ];

    for (const root of roots) {
      const rows = await walkRoot(root);
      console.log('ROOT', root, 'COUNT', rows.length);
      console.log(JSON.stringify(rows.slice(0, 40), null, 2));
    }
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    session.close();
  }
})();
