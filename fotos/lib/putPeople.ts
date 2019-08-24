import { PutObjectOutput } from "aws-sdk/clients/s3";
import { getS3PutParams } from "../common/getS3PutParams";

export function putPeople(s3, people, Key): Promise<PutObjectOutput> {
  const s3PutParams = getS3PutParams(people, Key);
  return s3.putObject(s3PutParams).promise()
    .catch((e) => {
      const logitall = { e, people };
      throw new Error(JSON.stringify(logitall));
    });
}
