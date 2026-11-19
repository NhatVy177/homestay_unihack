import { readFile } from 'node:fs/promises';
import { executeQuery } from '../database/connection.js';

// Chạy database/migrations/20261119_room_gender_from_residents.sql (D-077): phòng lấy giới tính của người đang ở. Chạy lại được.
const sqlText = await readFile(new URL('../../../database/migrations/20261119_room_gender_from_residents.sql', import.meta.url), 'utf8');
console.table((await executeQuery(sqlText)).recordset);
process.exit(0);
