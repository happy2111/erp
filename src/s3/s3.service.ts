import { Injectable, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type PutObjectCommandOutput,
  type DeleteObjectCommandOutput,
} from '@aws-sdk/client-s3';
import s3Config from './s3.config';

export interface UploadFileParams {
  key: string;
  body: Buffer;
  contentType?: string;
}

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @Inject(s3Config.KEY)
    private readonly config: ConfigType<typeof s3Config>,
  ) {
    this.s3 = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: true,
    });

    this.bucket = this.config.bucket;
  }

  async uploadFile(params: UploadFileParams): Promise<{ url: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    });

    const _: PutObjectCommandOutput = await this.s3.send(command);

    return {
      url: `${this.bucket}/${params.key}`,
    };
  }

  async deleteByKey(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const _: DeleteObjectCommandOutput = await this.s3.send(command);
  }

  deleteByUrl(url: string): Promise<void> {
    const key = this.extractKeyFromUrl(url);
    return this.deleteByKey(key);
  }

  private extractKeyFromUrl(url: string): string {
    // bucket/key
    const prefix = `${this.bucket}/`;
    if (!url.startsWith(prefix)) {
      throw new Error('Invalid S3 url');
    }
    return url.replace(prefix, '');
  }
}
