import { config, Endpoint, S3 } from "aws-sdk";

export default function createS3Client(): S3 {
  let options = {};

  // connect to local s3 if running offline
  if (process.env.IS_OFFLINE) {
    if (process.env.AWS_DEBUG) {
      config.logger = console;
    }
    options = {
      accessKeyId: "S3RVER",
      endpoint: new Endpoint("http://localhost:5000"),
      s3ForcePathStyle: true,
      secretAccessKey: "S3RVER",
    };
  }
  return new S3(options);
}
