import '../src/libs/db/associations';
import db from '../src/libs/db/index';

async function run() {
  console.log('Syncing...');
  await db.sync();
  await db.close();
  console.log('Finished sync');
}

run();
