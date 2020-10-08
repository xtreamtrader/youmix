import { Module } from '@nestjs/common';
import { AWSService } from './aws.service';

@Module({
  providers: [AWSService],
})
export class AwsModule {
  exports: [AWSService];
}
