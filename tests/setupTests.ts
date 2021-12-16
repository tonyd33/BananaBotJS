import db from '../src/libs/db';
import '../src/libs/db/associations';
import '../src/config';
// import 'leaked-handles';

afterAll(async () => {
  await db.close();
}, 5000);
