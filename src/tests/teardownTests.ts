import db from '../libs/db/db';

export default async function teardownTests() {
  await db.close();
}
