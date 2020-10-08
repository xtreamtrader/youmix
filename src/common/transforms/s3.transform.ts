import { awsConfig } from "src/config/aws.config";

export const pathToS3Url = (path: string) =>
  `https://${awsConfig.bucketName}.s3-${awsConfig.region}.amazonaws.com/${path}`;
