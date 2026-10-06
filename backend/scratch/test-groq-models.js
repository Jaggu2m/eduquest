import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testModel(modelName) {
  try {
    const res = await groq.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: 'Return a JSON object with a greeting property saying hello.',
        },
      ],
      response_format: { type: 'json_object' },
    });
    console.log(`Success with ${modelName}:`, res.choices[0].message.content);
    return true;
  } catch (err) {
    console.log(`Failed with ${modelName}:`, err.message);
    return false;
  }
}

async function main() {
  await testModel('openai/gpt-oss-120b');
  await testModel('qwen/qwen3.8-27b');
  await testModel('openai/gpt-oss-20b');
}

main();
