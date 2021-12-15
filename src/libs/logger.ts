import winston from 'winston';
import CloudWatchTransport from 'winston-aws-cloudwatch';
import config from '../config';

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
      formatLog: (item) =>
        `${item.level}: ${item.message} ${JSON.stringify(item.meta)}`,
    }),
  ],
});

export default logger;
