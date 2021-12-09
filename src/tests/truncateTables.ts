import { Model, ModelCtor } from 'sequelize/dist';
import { Database } from '../config';

export async function truncateTables(models: ModelCtor<Model>[]) {
  if (process.env.DATABASE !== Database.TESTING) {
    throw new Error("We shouldn't be using this outside of testing");
  }
  for (const model of models) {
    await model.destroy({ truncate: { cascade: true } as any });
  }
}
