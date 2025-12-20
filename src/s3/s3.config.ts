// s3.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.S3_REGION ?? 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY ?? 'admin',
  secretAccessKey: process.env.S3_SECRET_KEY ?? 'password123',
  bucket: process.env.S3_BUCKET ?? 'my-bucket',
}));
