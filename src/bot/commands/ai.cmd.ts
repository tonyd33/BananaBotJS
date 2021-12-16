import { CommandInteraction, Message, MessageCollector } from 'discord.js';
import { Discord, Slash, SlashChoice, SlashGroup, SlashOption } from 'discordx';
import {
  formatMessage,
  InteractionReplyType,
} from '../../libs/botUtils/interactionWrapper';
import logger from '../../libs/logger';
import { AI, AIBrain, AIBrainType } from '../../libs/openai/openai';

enum CollectorStopReason {
  userRequest = 'userRequest',
}

@Discord()
@SlashGroup('talk')
export class BananaAI {
  instances: {
    [userId: string]: {
      collector: MessageCollector;
      ai: AI;
      finished: boolean;
    };
  } = {};
  @Slash('start')
  async start(
    @SlashChoice(AIBrainType)
    @SlashOption('brain')
    brain: string,
    interaction: CommandInteraction
  ): Promise<void> {
    try {
      if (!interaction.channel) {
        await interaction.reply({
          content: formatMessage(
            'You should be sending this in a text channel!',
            { replyType: InteractionReplyType.warn }
          ),
        });
        return;
      }
      const userId = interaction.user.id;
      if (userId in this.instances && !this.instances[userId].finished) {
        await interaction.reply({
          content: formatMessage('You have an ongoing conversation with me!', {
            replyType: InteractionReplyType.warn,
          }),
        });
        return;
      }

      const ai = new AI(brain as AIBrainType);
      const channel = interaction.channel;
      const collector = channel.createMessageCollector({
        filter: (message) => message.author.id === userId,
        time: 1000 * 60 * 5,
      });

      this.instances[userId] = { collector, ai, finished: false };

      collector.on('collect', async (message: Message) => {
        try {
          await message.channel.sendTyping();
          const reply = await ai.human(message.cleanContent);
          await message.reply(reply);
        } catch (e) {
          logger.error(e);
        }
      });
      collector.on('end', async (collected, reason: string) => {
        if (reason !== CollectorStopReason.userRequest) {
          await channel.send(
            "I'm sorry, I just remembered I have go to now, bye!"
          );
        }
        this.instances[userId] = { ...this.instances[userId], finished: true };
      });

      await interaction.reply({
        content: formatMessage("I'm ready to talk now!", {
          replyType: InteractionReplyType.success,
        }),
      });
    } catch (e) {
      logger.error(e);
      await interaction.reply({
        content: formatMessage('Something went wrong!', {
          replyType: InteractionReplyType.error,
        }),
      });
    }
  }

  @Slash('stop')
  async stop(interaction: CommandInteraction) {
    try {
      if (!interaction.channel) {
        await interaction.reply({
          content: formatMessage(
            'You should be sending this in a text channel!',
            { replyType: InteractionReplyType.warn }
          ),
        });
        return;
      }
      const userId = interaction.user.id;
      if (!(userId in this.instances) || this.instances[userId].finished) {
        await interaction.reply({
          content: formatMessage('I never started talking to you did I? 😧', {
            replyType: InteractionReplyType.warn,
          }),
        });
        return;
      }
      this.instances[userId].finished = true;
      const { collector } = this.instances[userId];
      collector.stop(CollectorStopReason.userRequest);
      interaction.reply({
        content: formatMessage('Session ended', {
          replyType: InteractionReplyType.success,
        }),
      });
    } catch (e) {
      logger.error(e);
      await interaction.reply({
        content: formatMessage('Something went wrong!', {
          replyType: InteractionReplyType.error,
        }),
      });
    }
  }
}
