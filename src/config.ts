export interface SequelizeArgs {
  database: string;
  user: string;
  password: string;
  host: string;
  storage: string;
}

export enum Database {
  PRODUCTION = 'PRODUCTION',
  DEVELOPMENT = 'DEVELOPMENT',
  TESTING = 'TESTING',
}

const databases: Database[] = Object.values(Database);

const isProductionEnv = process.env.ENV === 'PRODUCTION';

function getSequelizeArgs(database: Database): SequelizeArgs {
  return {
    database: 'database',
    user: 'user',
    password: 'password',
    host: 'localhost',
    storage: `${database}.sqlite`,
  };
}

export interface Config {
  database: SequelizeArgs;
  isProduction: boolean;
}

const envDatabase =
  process.env.DATABASE && databases.includes(process.env.DATABASE as Database)
    ? (process.env.DATABASE as Database)
    : Database.TESTING;

const config: Config = {
  database: getSequelizeArgs(envDatabase),
  isProduction: isProductionEnv,
};

export default config;
