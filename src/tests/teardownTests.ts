import db from '../libs/db';

export default async function teardownTests() {
  await db.close();
}
