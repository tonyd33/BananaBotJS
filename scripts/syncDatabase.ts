import db from '../src/libs/db/db';
import '../src/libs/db/associations';

async function run() {
  console.log('Syncing...');
  await db.sync();
  console.log('Finished sync');
}

run();
