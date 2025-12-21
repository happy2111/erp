import { Injectable, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import s3Config from './s3.config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadFileParams {
  key: string;
  contentType?: string;
  expiresIn?: number; // время жизни presigned URL в секундах
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

  /**
   * Генерация presigned URL для загрузки файла
   */
  async getUploadUrl(params: UploadFileParams): Promise<{ url: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: params.expiresIn ?? 3600, // по умолчанию 1 час
    });

    return { url };
  }

  /**
   * Генерация presigned URL для скачивания файла
   */
  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Удаление по ключу
   */
  async deleteByKey(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
  }

  /**
   * Удаление по URL
   */
  async deleteByUrl(url: string): Promise<void> {
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
