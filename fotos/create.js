
import uuid from 'uuid';
import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import lambda from './lib/lambda';
import { success, failure } from './lib/responses';
import { requestSchema, ddbParamsSchema } from './joi/create';

const fotopiaGroup = process.env.FOTOPIA_GROUP;
export const THUMB_SUFFIX = '-thumbnail';

export function validateRequest(requestBody) {
  const data = JSON.parse(requestBody);
  const result = Joi.validate(data, requestSchema);
  console.log('joi request', result);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function createThumbKey(key) {
  const keySplit = key.split('.');
  const ext = keySplit[keySplit.length - 1];
  return `${key.substr(0, key.lastIndexOf(ext) - 1)}${THUMB_SUFFIX}.${ext}`;
}

export function getInvokeThumbnailsParams(data) {
  return {
    InvocationType: 'RequestResponse',
    FunctionName: process.env.IS_OFFLINE ? 'thumbs' : `${process.env.LAMBDA_PREFIX}thumbs`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      body: JSON.stringify({
        key: data.img_key,
        thumbKey: createThumbKey(data.img_key),
      }),
    }),
  };
}

export function getDynamoDbParams(data, id, group) {
  const timestamp = new Date().getTime();
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      username: data.username,
      userIdentityId: data.userIdentityId,
      group,
      id,
      birthtime: new Date(data.birthtime).getTime(),
      tags: data.tags,
      people: data.people, // for rekognition categorisation
      img_key: data.img_key, // s3 object key
      img_thumb_key: createThumbKey(data.img_key),
      meta: data.meta, // whatever metadata we've got for this item
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  const result = Joi.validate(params, ddbParamsSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return params;
  }
}

export async function createItem(event, context, callback) {
  const id = uuid.v1();
  try {
    const request = validateRequest(event.body);
    console.log('create request', request);
    const invokeParams = getInvokeThumbnailsParams(request);
    console.log('invokeParams', invokeParams);
    const thumbCreateResponse = await lambda.invoke(invokeParams).promise();
    console.log('thumbCreateResponse', thumbCreateResponse);
    const ddbParams = getDynamoDbParams(request, id, fotopiaGroup, thumbCreateResponse);
    await dynamodb.put(ddbParams).promise();
    return callback(null, success(ddbParams.Item));
  } catch (err) {
    return callback(null, failure(err));
  }
}

