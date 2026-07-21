import * as Joi from 'joi';

/**
 * Joi schema validated on startup when ConfigModule loads environment variables
 */
export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  API_VERSION: Joi.string().required().default('0.1.1'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
});
