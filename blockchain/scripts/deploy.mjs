import { main } from './deployment.mjs';
import { FujiSetupError } from './fuji-keygen.mjs';

main().catch(error => {
  console.error(error instanceof FujiSetupError ? error.message : 'Deployment failed. Preserve pending records, check the RPC and explorer before retrying. No secret diagnostics printed.');
  process.exitCode = 1;
});
