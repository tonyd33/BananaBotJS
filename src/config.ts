import path from 'path';
import * as dotenv from 'dotenv';
import fs from 'fs';
export interface SequelizeArgs {
  database: string;
  user: string;
  password: string;
  host: string;
  port: string;
}

export enum Environment {
  PRODUCTION = 'PRODUCTION',
  DEVELOPMENT = 'DEVELOPMENT',
  TESTING = 'TESTING',
}

export function configureEnv(env: Environment) {
  const sharedConfigPath = path.resolve(__dirname, `../config/env/SHARED.env`);
  const configPath = path.resolve(__dirname, `../config/env/${env}.env`);
  const envVariables: dotenv.DotenvParseOutput = {
    ...dotenv.parse(fs.readFileSync(sharedConfigPath)),
    ...dotenv.parse(fs.readFileSync(configPath)),
  };
  return envVariables;
}

const envVars = configureEnv(
  (process.env.ENV as Environment) ?? Environment.DEVELOPMENT
);

function getSequelizeArgs(
  envVariables: dotenv.DotenvParseOutput
): SequelizeArgs {
  return {
    database: envVariables.DB_DATABASE,
    user: envVariables.DB_USER,
    password: envVariables.DB_PASSWORD,
    host: envVariables.DB_HOST,
    port: envVariables.DB_PORT,
  };
}

export interface Config {
  database: SequelizeArgs;
  env: Environment;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  openAIKey: string;
}

const config: Config = {
  database: getSequelizeArgs(envVars),
  awsAccessKeyId: envVars.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
  awsRegion: envVars.AWS_REGION,
  openAIKey: envVars.OPEN_AI_KEY,
  env: Object.values(Environment).includes(process.env.ENV as Environment)
    ? (process.env.ENV as Environment)
    : Environment.DEVELOPMENT,
};

export default config;
