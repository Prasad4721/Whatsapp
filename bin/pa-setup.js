#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

async function main() {
  console.log('=============================================');
  console.log('   WhatsApp-PA — AI EXECUTIVE ASSISTANT      ');
  console.log('             Setup Configurator              ');
  console.log('=============================================\n');

  const envPath = path.join(process.cwd(), '.env');
  const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  const questions = [
    {
      type: 'input',
      name: 'GROQ_API_KEY',
      message: 'Enter your Groq API Key:',
      default: extractEnv(existingEnv, 'GROQ_API_KEY') || '',
      validate: (input) => input.length > 10 ? true : 'Please enter a valid Groq API Key.'
    },
    {
      type: 'input',
      name: 'GROQ_MODEL',
      message: 'Which Groq model do you want to use?',
      default: extractEnv(existingEnv, 'GROQ_MODEL') || 'llama-3.3-70b-versatile',
    },
    {
      type: 'input',
      name: 'PORT',
      message: 'What port should the Web Dashboard run on?',
      default: extractEnv(existingEnv, 'PORT') || '3000',
    },
    {
      type: 'input',
      name: 'NOTIFY_THRESHOLD',
      message: 'Notify Threshold (in minutes):',
      default: extractEnv(existingEnv, 'NOTIFY_THRESHOLD') || '60',
    },
    {
      type: 'confirm',
      name: 'AUTO_REPLY_ENABLED',
      message: 'Enable automatic AI replies by default?',
      default: extractEnv(existingEnv, 'AUTO_REPLY_ENABLED') === 'true'
    }
  ];

  const answers = await inquirer.prompt(questions);

  let newEnv = '';
  newEnv += `GROQ_API_KEY=${answers.GROQ_API_KEY}\n`;
  newEnv += `GROQ_MODEL=${answers.GROQ_MODEL}\n`;
  newEnv += `PORT=${answers.PORT}\n`;
  newEnv += `NOTIFY_THRESHOLD=${answers.NOTIFY_THRESHOLD}\n`;
  newEnv += `AUTO_REPLY_ENABLED=${answers.AUTO_REPLY_ENABLED}\n`;
  newEnv += `LOG_LEVEL=info\n`;
  newEnv += `LOG_DIR=./logs\n`;

  fs.writeFileSync(envPath, newEnv);

  console.log('\n✅ Setup complete! Configuration saved to .env file.');
  console.log('To start the assistant, run: npm start\n');
}

function extractEnv(envContent, key) {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

main().catch(console.error);
