import db from '../libs/db/db';
import '../libs/db/associations';

async function run() {
  console.log('Syncing...');
  await db.sync();
  console.log('Finished sync');
}

run();
