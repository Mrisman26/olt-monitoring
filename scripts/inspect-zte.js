const fs = require('fs');
const snmp = require('net-snmp');
const session = snmp.createSession('192.168.251.2', 'server', {
  version: snmp.Version2c,
  port: 161,
  timeout: 10000,
  retries: 1,
});

const roots = [
  '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.2',
  '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.1',
  '1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.18',
  '1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.4',
];
const out = [];

function formatValue(value) {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value.toString('utf8').replace(/\0/g, '');
  return value;
}

function walkOid(oid) {
  return new Promise((resolve, reject) => {
    let count = 0;
    out.push(`WALK ${oid}`);
    session.subtree(
      oid,
      (vb) => {
        if (count < 200) {
          out.push(JSON.stringify({ oid: vb.oid, type: vb.type, value: formatValue(vb.value) }));
        }
        count += 1;
      },
      (err) => {
        if (err) reject(err);
        else {
          out.push(`done ${oid} count ${count}`);
          resolve();
        }
      }
    );
  });
}

(async () => {
  try {
    for (const oid of roots) {
      await walkOid(oid);
    }
  } catch (error) {
    out.push('ERROR ' + String(error));
  } finally {
    session.close();
    fs.writeFileSync('scripts/inspect-zte-output.txt', out.join('\n'), 'utf8');
  }
})();
