import assert from 'node:assert/strict';
import { it } from 'node:test';
import express from '../../web/backend/node_modules/express/index.js';
import router from '../../web/backend/routes/avalanche.routes.js';
it('HTTP exposes public configuration and refuses unauthenticated workflow requests', async () => {
  const previous = process.env.AVALANCHE_ENABLED;
  process.env.AVALANCHE_ENABLED = 'false';
  const app = express(); app.use(express.json()); app.use('/api/avalanche', router);
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/api/avalanche';
    assert.equal((await (await fetch(url + '/config')).json()).enabled, false);
    assert.equal((await fetch(url + '/cases')).status, 401);
    assert.equal((await fetch(url + '/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.AVALANCHE_ENABLED; else process.env.AVALANCHE_ENABLED = previous;
  }
});
