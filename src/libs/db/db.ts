import config from '../../config';
import { Sequelize } from 'sequelize/dist';

export function connectDB() {
  return new Sequelize(
    encodeURI(
      `mysql://${config.database.user}:${config.database.password}@${config.database.host}` +
        `:${config.database.port}/${config.database.database}`
    ),
    {
      // logging: console.log,
      logging: false,
      pool: {
        max: 5,
      },
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    }
  );
}
