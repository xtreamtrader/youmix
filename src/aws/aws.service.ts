import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { awsConfig } from 'src/config/aws.config';
import {
  IAWSS3UploadResult,
  IAWSS3UploadFile,
} from './aws.interface';
import { File } from 'src/file/file.entity';

AWS.config.update(awsConfig);

@Injectable()
export class AWSService {
  private readonly s3 = new AWS.S3();
  private readonly bucketName = awsConfig.bucketName;

  async upload(file: IAWSS3UploadFile): Promise<IAWSS3UploadResult> {
    const { originalname, buffer, directory } = file;

    const params: AWS.S3.PutObjectRequest = {
      Body: buffer,
      Bucket: this.bucketName,
      Key: directory
        ? `${directory}/${this.transformFilenameToTimestamp(originalname)}`
        : this.transformFilenameToTimestamp(originalname),
      ACL: 'public-read',
    };

    const result = await this.s3.putObject(params).promise();

    return {
      path: params.Key,
      eTag: result.ETag,
      originalName: file.originalname,
    };
  }

  async deleteOneFile(file: File): Promise<void> {
    const params = {
      Key: file.path,
      Bucket: this.bucketName,
    };

    await this.s3.headObject(params).promise();

    await this.s3
      .deleteObject({ Key: file.path, Bucket: this.bucketName })
      .promise();
  }

  private transformFilenameToTimestamp(filename: string): string {
    return `${+new Date()}.${filename}`;
  }
}
