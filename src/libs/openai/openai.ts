import { SlashChoicesType } from 'discordx';
import OpenAI from 'openai-api';
import config from '../../config';

export enum AIBrainType {
  smooth = 'smooth',
  assistant = 'assistant',
}

export const AIBrain: SlashChoicesType & { [brain in AIBrainType]: string } = {
  smooth:
    'The following is a casual conversation between two friends. ' +
    'They enjoy friendly banter but are respectful to each other.' +
    '\n\n' +
    "Human: yo what's up man\n" +
    'AI: nothing much, been trying to hit challenger in league\n' +
    'Human: oh damn how close are you now?\n' +
    "AI: i'm silver 4 lmao\n" +
    "Human: holy crap, you're awful lmao",
  assistant:
    'The following is a conversation with an AI assistant.' +
    'The assistant is helpful, creative, clever, and very friendly. ' +
    '\n\n' +
    'Human: Hello, who are you?\n' +
    'AI: I am an AI created by OpenAI. How can I help you today?',
};

export const REMEMBER = 8;
export const AI_MODIFIER = {
  // start: `The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly. \n\nHuman: Hello, who are you?\nAI: I am an AI created by OpenAI. How can I help you today?`,
  start: AIBrain.smooth,
  maxTokens: 150,
  temperature: 0.9,
  topP: 1,
  presencePenalty: 0.6,
  frequencyPenalty: 0,
  name: 'AI',
  otherName: 'Human',
};

export class AI {
  conversation: { author: number; prompt: string }[];
  openAI: OpenAI;
  initiator: string;

  constructor(brain?: AIBrainType) {
    this.initiator = AIBrain[brain ?? AIBrainType.smooth];
    this.openAI = new OpenAI(config.openAIKey);
    this.conversation = [];
  }

  /**
   * Add human message to conversation
   *
   * @param {string} message What the human said
   */
  public async human(message: string) {
    if (this.conversation.length >= REMEMBER) {
      this.conversation.shift();
      this.conversation.shift();
    }

    this.conversation.push({
      author: 1,
      prompt: message,
    });

    const answer = await this.openAI.complete({
      engine: 'davinci',
      prompt: this.getConversation(),
      maxTokens: AI_MODIFIER.maxTokens,
      temperature: AI_MODIFIER.temperature,
      topP: AI_MODIFIER.topP,
      presencePenalty: AI_MODIFIER.presencePenalty,
      frequencyPenalty: AI_MODIFIER.frequencyPenalty,
      bestOf: 1,
      n: 1,
      stop: ['\n', AI_MODIFIER.otherName + ':', AI_MODIFIER.name + ':'],
    });

    const cleanedAnswer = answer.data.choices[0].text.trim();
    this.conversation.push({
      author: 0,
      prompt: cleanedAnswer,
    });

    return cleanedAnswer;
  }

  /**
   * Generate the conversation that OpenAI receives
   */
  private getConversation() {
    let conv = this.initiator;

    for (const message of this.conversation) {
      conv += `\n${
        message.author ? AI_MODIFIER.otherName : AI_MODIFIER.name
      }: ${message.prompt}`;
    }

    conv += `\n${AI_MODIFIER.name}:`;

    return conv;
  }
}
