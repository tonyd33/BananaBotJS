import { Sequelize } from 'sequelize/dist';
import config from '../../config';

const db = new Sequelize({
  ...config.database,
  dialect: 'sqlite',
  // logging: console.log,
  logging: false,
});

db.sync();

export default db;
