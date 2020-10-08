import * as config from 'config';

const awsGlobalConfig = config.get('aws');

export const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || awsGlobalConfig.accessKey,
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY || awsGlobalConfig.secretAccessKey,
  bucketName: awsGlobalConfig.bucketName,
  region: process.env.AWS_REGION || awsGlobalConfig.region,
};
