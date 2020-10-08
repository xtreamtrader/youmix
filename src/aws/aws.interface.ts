import { EDirectory } from 'src/common/interfaces/file.interface';

export interface IAWSS3UploadResult {
  path: string;
  eTag: string;
  originalName: string;
}

export interface IAWSS3UploadFile {
  originalname: string;
  buffer: Buffer;
  directory?: EDirectory;
}

export interface IAWSS3DeleteResult {
  affected: number;
}
