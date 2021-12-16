import db from '../src/libs/db';

export default async function teardownTests() {
  await db.close();
}
