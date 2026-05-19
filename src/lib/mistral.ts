import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;

export const mistral = new Mistral({
  apiKey: apiKey || '',
});
