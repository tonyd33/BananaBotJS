import { Model, ModelCtor } from 'sequelize/dist';
import config, { Environment } from '../src/config';

export async function truncateTables(models: ModelCtor<Model>[]) {
  if (config.env !== Environment.TESTING) {
    throw new Error("We shouldn't be using this outside of testing");
  }
  for (const model of models) {
    await model.destroy({ truncate: { cascade: true } as any });
  }
}
