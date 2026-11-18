import dotenv from 'dotenv';
import tediousSql from 'mssql';
import { createRequire } from 'node:module';

dotenv.config();

const require = createRequire(import.meta.url);
let poolPromise;

// Driver ODBC (đăng nhập Windows) chỉ nạp khi cần: trên Linux/Azure không có và không cần, dùng tedious với DB_USER/DB_PASS.
let msv8Cache;
function loadMsv8() {
  msv8Cache ??= require('mssql/msnodesqlv8.js');
  return msv8Cache;
}

function readEnv(name, fallback = '', { trim = true } = {}) {
  const value = process.env[name] ?? fallback;
  return trim ? String(value).trim() : String(value);
}

function isTrustedConnection() {
  const trusted = readEnv('DB_TRUSTED_CONNECTION', '').toLowerCase();
  const user = readEnv('DB_USER');
  return trusted === 'true' || (!user && trusted !== 'false');
}

function getSqlDriver() {
  return isTrustedConnection() ? loadMsv8() : tediousSql;
}

function getConfig() {
  const server = readEnv('DB_SERVER', 'localhost');
  const instanceName = readEnv('DB_INSTANCE');
  const port = Number(readEnv('DB_PORT', '0'));
  const hasPort = Number.isFinite(port) && port > 0;
  const database = readEnv('DB_NAME');
  const user = readEnv('DB_USER');
  const password = readEnv('DB_PASS', '', { trim: false });
  const trusted = isTrustedConnection();

  if (!database) {
    throw new Error('Missing SQL Server config: DB_NAME.');
  }

  if (trusted) {
    let serverStr = server;
    if (instanceName) {
      serverStr = `${server}\\${instanceName}`;
    } else if (hasPort && !server.toLowerCase().startsWith('tcp:')) {
      serverStr = `tcp:${server},${port}`;
    }
    return {
      connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${serverStr};Database=${database};Trusted_Connection=yes;`
    };
  }

  if (!user) {
    throw new Error(
      'Missing SQL Server config: DB_USER (or set DB_TRUSTED_CONNECTION=true). ' +
      'Check web/backend/.env for local SQL Server values.'
    );
  }

  if (hasPort && instanceName) {
    throw new Error('Use either DB_PORT or DB_INSTANCE in web/backend/.env, not both.');
  }

  const config = {
    server,
    port: hasPort ? port : undefined,
    database,
    user,
    password,
    options: {
      encrypt: readEnv('DB_ENCRYPT', 'false').toLowerCase() === 'true',
      trustServerCertificate: readEnv('DB_TRUST_CERT', 'true').toLowerCase() !== 'false',
      useUTC: false,
      ...(!hasPort && instanceName ? { instanceName } : {})
    }
  };

  return config;
}

export function getPool() {
  if (!poolPromise) {
    const activeSql = getSqlDriver();
    const config = getConfig();
    poolPromise = new activeSql.ConnectionPool(config).connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

export async function executeProcedure(procedureName, parameters = []) {
  const pool = await getPool();
  const request = pool.request();

  for (const parameter of parameters) {
    request.input(parameter.name, parameter.type, parameter.value);
  }

  return request.execute(procedureName);
}

export async function executeQuery(sqlString, parameters = []) {
  const pool = await getPool();
  const request = pool.request();

  for (const parameter of parameters) {
    request.input(parameter.name, parameter.type, parameter.value);
  }

  return request.query(sqlString);
}

export const sql = new Proxy(tediousSql, {
  get(target, prop) {
    const driver = getSqlDriver();
    return driver[prop] ?? target[prop];
  }
});
