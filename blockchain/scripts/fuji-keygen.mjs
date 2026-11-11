import { readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export class FujiSetupError extends Error {}

export async function generateFujiWallets(directory = process.cwd()) {
  const envPath = resolve(directory, '.env');
  let original = '';
  let exists = false;
  try { original = await readFile(envPath, 'utf8'); exists = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const env = parseEnv(original);
  if (Object.entries(env).some(([name, value]) => /PRIVATE_KEY/i.test(name) && value.trim())) {
    throw new FujiSetupError('Refusing to overwrite private keys already present in .env.');
  }

  const keys = [generatePrivateKey(), generatePrivateKey(), generatePrivateKey()];
  const [deployer, accountant, relayer] = keys.map(key => privateKeyToAccount(key).address);
  const entries = {
    FUJI_RPC_URL: env.FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    FUJI_DEPLOYER_PRIVATE_KEY: keys[0],
    FUJI_MANAGER_ADDRESS: deployer,
    FUJI_ACCOUNTANT_ADDRESS: accountant,
  };
  // Keep unrelated configuration and replace blank placeholders instead of duplicating them.
  const lines = original.split(/\r?\n/).filter(line => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=/);
    return !match || !(match[1] in entries);
  });
  const updated = `${lines.join('\n').trimEnd()}\n${Object.entries(entries).map(([k, v]) => `${k}=${v}`).join('\n')}\n`;
  const backendPath = resolve(directory, '.fuji-backend-env.local');
  // Exclusive creation prevents a second run replacing the backend wallet keys.
  await writeFile(backendPath, [
    `AVALANCHE_MANAGER_PRIVATE_KEY=${keys[0]}`,
    `AVALANCHE_ACCOUNTANT_PRIVATE_KEY=${keys[1]}`,
    `AVALANCHE_RELAYER_PRIVATE_KEY=${keys[2]}`,
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  await writeFile(envPath, updated, { flag: exists ? 'w' : 'wx', mode: 0o600 });
  await chmod(envPath, 0o600);
  await chmod(backendPath, 0o600);
  return { deployer, accountant, relayer };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const addresses = await generateFujiWallets();
    console.log(`Deployer / manager: ${addresses.deployer}`);
    console.log(`Accountant: ${addresses.accountant}`);
    console.log(`Relayer: ${addresses.relayer}`);
  } catch (error) {
    // Do not print raw exceptions: libraries may include secret inputs in diagnostics.
    console.error(error instanceof FujiSetupError ? error.message
      : error.code === 'EEXIST' ? 'Refusing to overwrite an existing wallet file.'
        : 'Fuji key generation failed. Check local file permissions; preserve any wallet files already written.');
    process.exitCode = 1;
  }
}
