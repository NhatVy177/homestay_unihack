import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { encodeAbiParameters, getAddress, isAddress } from 'viem';
import { FujiSetupError } from './fuji-keygen.mjs';

// API v2 (v1 retired): https://docs.sourcify.dev/docs/api/
const server = 'https://sourcify.dev/server';
export function verificationRequest(deployment, artifact, input, inputText) {
  if (deployment.chainId !== 43113 || !isAddress(deployment.address) || !/^0x[0-9a-fA-F]{64}$/.test(deployment.transactionHash || '')) {
    throw new FujiSetupError('A confirmed Fuji deployment manifest is required before verification.');
  }
  const compilerVersion = artifact.compilerVersion.replace(/\.Emscripten\.clang$/, '');
  if (!compilerVersion.startsWith('0.8.38+') || deployment.compilerVersion !== artifact.compilerVersion
    || input.language !== 'Solidity' || !input.settings?.optimizer?.enabled || input.settings.optimizer.runs !== 200 || input.settings.evmVersion !== 'cancun') {
    throw new FujiSetupError('Compiler version or settings differ from the approved Fuji build.');
  }
  if (createHash('sha256').update(inputText).digest('hex') !== deployment.standardInputSha256) {
    throw new FujiSetupError('Standard JSON input differs from the input saved at deployment. Do not verify a different build.');
  }
  const args = encodeAbiParameters([{ type: 'address' }, { type: 'address' }], [getAddress(deployment.manager), getAddress(deployment.accountant)]);
  if (deployment.constructorArguments !== args) throw new FujiSetupError('Constructor arguments differ from the deployment manifest.');
  return { stdJsonInput: input, compilerVersion, contractIdentifier: `${artifact.sourceName}:${artifact.contractName}`, creationTransactionHash: deployment.transactionHash };
}

export function exactMatch(record, deployment) {
  return record?.chainId === String(deployment.chainId) && isAddress(record.address)
    && getAddress(record.address) === getAddress(deployment.address)
    && record.creationMatch === 'exact_match' && record.runtimeMatch === 'exact_match'
    && record.deployment?.transactionHash?.toLowerCase() === deployment.transactionHash.toLowerCase();
}

export async function verifyFuji({ deployment, request, fetcher = fetch, persist = async () => {}, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 20, log = console.log }) {
  const lookup = `${server}/v2/contract/43113/${deployment.address}?fields=deployment`;
  const call = async (url, options) => {
    const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(20000) });
    const body = await response.json();
    if (!response.ok && ![404, 409].includes(response.status)) throw new FujiSetupError(`Sourcify returned HTTP ${response.status}. Verification remains pending; retry later.`);
    return { status: response.status, body };
  };
  const finish = async record => {
    if (!exactMatch(record, deployment)) throw new FujiSetupError('Source did not match creation and runtime exactly. Manifest is not marked verified.');
    deployment.sourceVerification = 'verified';
    deployment.sourceVerificationProvider = 'Sourcify API v2';
    deployment.sourceVerificationUrl = `https://repo.sourcify.dev/43113/${deployment.address}`;
    deployment.explorerUrl = `https://testnet.snowtrace.io/address/${deployment.address}`;
    deployment.sourceVerifiedAt = record.verifiedAt || new Date().toISOString();
    deployment.sourceVerificationMatch = { creation: record.creationMatch, runtime: record.runtimeMatch };
    await persist(deployment);
    log(`Source verified exactly: ${deployment.sourceVerificationUrl}`);
    return deployment;
  };
  const existing = await call(lookup);
  if (existing.status === 200 && exactMatch(existing.body, deployment)) return finish(existing.body);
  let job = deployment.sourceVerificationJob;
  if (!job) {
    const submitted = await call(`${server}/v2/verify/43113/${deployment.address}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
    });
    if (submitted.status === 409) return finish((await call(lookup)).body);
    job = submitted.body.verificationId;
    if (!/^[0-9a-f-]{36}$/i.test(job || '')) throw new FujiSetupError('Sourcify did not return a valid verification job.');
    deployment.sourceVerificationJob = job;
    await persist(deployment);
  }
  for (let i = 0; i < attempts; i++) {
    const status = await call(`${server}/v2/verify/${job}`);
    if (status.body.error) {
      delete deployment.sourceVerificationJob;
      await persist(deployment);
      throw new FujiSetupError(`Sourcify verification failed (${status.body.error.customCode || 'unknown'}). Source remains pending.`);
    }
    if (status.body.isJobCompleted) return finish((await call(lookup)).body);
    log(`Source verification pending (${i + 1}/${attempts}).`);
    await wait(3000);
  }
  throw new FujiSetupError('Verification job is still pending. Rerun verify:fuji to resume the saved job.');
}

async function main() {
  if (process.argv.slice(2).some(arg => arg !== '--check')) throw new FujiSetupError('Usage: verify:fuji [--check]');
  const manifest = new URL('../deployments/fuji.json', import.meta.url);
  let deployment;
  try { deployment = JSON.parse(await readFile(manifest, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') throw new FujiSetupError('No Fuji deployment manifest yet. Finish funding and deploy before verifying source.'); throw error; }
  const artifact = JSON.parse(await readFile(new URL('../artifacts/DormSettlement.json', import.meta.url), 'utf8'));
  const inputText = await readFile(new URL('../artifacts/standard-input.json', import.meta.url), 'utf8');
  const request = verificationRequest(deployment, artifact, JSON.parse(inputText), inputText);
  if (process.argv.includes('--check')) { console.log('Verification input checked locally; no source submitted.'); return; }
  await verifyFuji({ deployment, request, persist: value => writeFile(manifest, JSON.stringify(value, null, 2) + '\n') });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof FujiSetupError ? error.message : 'Verification failed. Preserve the deployment manifest and check Sourcify availability before retrying.');
    process.exitCode = 1;
  });
}
