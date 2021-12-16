import winston from 'winston';
import config from '../config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CloudWatchTransport = require('winston-aws-cloudwatch');

const logger = winston.createLogger({
  transports: [
    new CloudWatchTransport({
      logGroupName: 'banana',
      logStreamName: 'bananaStream',
      createLogGroup: true,
      createLogStream: true,
      submissionInterval: 2000,
      submissionRetryCount: 1,
      batchSize: 20,
      awsConfig: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
        region: config.awsRegion,
      },
      formatLog: (item: { level: number; message: string; meta: object }) =>
        `${item.level}: ${item.message} ${JSON.stringify(item.meta)}`,
    }),
  ],
});

export default logger;
