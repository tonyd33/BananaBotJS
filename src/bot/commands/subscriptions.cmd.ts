import {
  ButtonComponent,
  Discord,
  Slash,
  SlashGroup,
  SlashOption,
} from 'discordx';
import {
  formatEmbed,
  formatMessage,
} from '../../libs/botUtils/interactionWrapper';
import {
  querySubscriptions,
  ClientSubscription,
} from '../../libs/subscriptions/subscriptions';
import { InteractionReplyOpts } from '../../libs/botUtils/interactionWrapper';
import {
  SubscriptionDoesNotExistError,
  SubscriptionExistsError,
  UserAlreadySubscribedError,
} from '../../libs/subscriptions/subscriptionsErrors';
import {
  ApplicationCommandOptionChoice,
  AutocompleteInteraction,
  ButtonInteraction,
  CommandInteraction,
  EmbedField,
  EmbedFieldData,
  InteractionReplyOptions,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessagePayload,
  User,
} from 'discord.js';
import {
  ISubscriptionsDatabase,
  SQLSubscriptionsDatabase,
} from '../../libs/subscriptions/database';
import { InteractionReplyType } from '../../libs/botUtils/interactionWrapper';
import { bold, userMention } from '@discordjs/builders';
import SubscriptionsMentionMessage from '../../libs/db/models/SubscriptionsMentionMessage';
import { UserNotSubscribedError } from '../../libs/subscriptions/subscriptionsErrors';
import logger from '../../libs/logger';
import { Interaction } from 'discord.js';

enum AcceptanceState {
  accepted = '🟢',
  declined = '🔴',
  pending = '🟠',
}

const acceptButtonId = 'accept-btn';
const declineButtonId = 'decline-btn';
const mentionButtonId = 'mention-btn';
const subscribeButtonId = 'subscribe-btn';
const unsubscribeButtonId = 'unsubscribe-btn';

@Discord()
@SlashGroup('sub', 'Subscriptions', {
  list: 'List-type commands',
})
export class Subscriptions {
  subscriptionsDatabase: ISubscriptionsDatabase;

  constructor() {
    this.subscriptionsDatabase = new SQLSubscriptionsDatabase();
  }

  @Slash('join', { description: 'Subscribes to a subscription' })
  async join(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptionsWithConfig({
        limitToUserUnsubscribed: true,
      }),
      type: 'STRING',
    })
    subscriptionId: number,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (interaction.isAutocomplete()) return;
    try {
      await interaction.deferReply({ ephemeral: true });
      const subscription = await this.subscriptionsDatabase.subscribeUser({
        userId: interaction.member.user.id,
        subscriptionId: subscriptionId,
      });

      interaction.followUp({
        content: formatMessage(`Subscribed to ${subscription.name}!`, {
          replyType: InteractionReplyType.success,
        }),
        ephemeral: true,
      });
    } catch (e) {
      const failureOpts: InteractionReplyOpts = {
        replyType: InteractionReplyType.error,
      };
      let message: string;
      if (e instanceof UserAlreadySubscribedError) {
        message = "You're already subscribed!";
      } else if (e instanceof SubscriptionDoesNotExistError) {
        message = "This subscription doesn't exist anymore for some reason...";
      } else {
        logger.error(e);
        message = "Something weird happened... we couldn't make it happen.";
      }
      interaction.followUp({
        content: formatMessage(message, failureOpts),
        ephemeral: true,
      });
    }
  }

  @Slash('create', { description: 'Creates a subscription' })
  async create(
    @SlashOption('name', {
      autocomplete: false,
      type: 'STRING',
    })
    name: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (!interaction.isCommand()) return;
    try {
      await interaction.deferReply();
      await this.subscriptionsDatabase.createSubscription({
        guildId: interaction.guildId,
        subscriptionName: name,
      });
      interaction.followUp(
        formatMessage(`Created ${name}`, {
          replyType: InteractionReplyType.success,
        })
      );
    } catch (e) {
      const failureOpts: InteractionReplyOpts = {
        replyType: InteractionReplyType.error,
      };
      let message: string;
      if (e instanceof SubscriptionExistsError) {
        message = `${name} already exists in this server!`;
      } else {
        logger.error(e);
        message = `Something weird happened... we couldn't create ${name} for some reason.`;
      }
      interaction.followUp({
        content: formatMessage(message, failureOpts),
        ephemeral: true,
      });
    }
  }

  @Slash('leave', { description: 'Unsubscribes to a subscription' })
  async leave(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptionsWithConfig({
        limitToUserSubscribed: true,
      }),
      type: 'STRING',
    })
    subscriptionId: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (!interaction.isCommand()) return;

    try {
      await interaction.deferReply({ ephemeral: true });
      await this.subscriptionsDatabase.unsubscribeUser({
        userId: interaction.member.user.id,
        subscriptionId: parseInt(subscriptionId, 10),
      });
      // TODO: Get subscription name and send it
      await interaction.followUp({
        content: formatMessage('Left the subscription!', {
          replyType: InteractionReplyType.success,
        }),
        ephemeral: true,
      });
    } catch (e) {
      let message: string;
      if (e instanceof UserNotSubscribedError) {
        message = "You weren't subscribed in the first place!";
      } else {
        logger.error(e);
        message = 'Something weird happened...';
      }
      await interaction.followUp({
        content: formatMessage(message, {
          replyType: InteractionReplyType.error,
        }),
        ephemeral: true,
      });
    }
  }

  @Slash('delete', { description: 'Deletes a subscription' })
  async delete(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptionsWithConfig(),
      type: 'STRING',
    })
    subscriptionId: number,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (!interaction.isCommand()) return;

    try {
      await interaction.deferReply();
      const oldSubscription =
        await this.subscriptionsDatabase.deleteSubscription({
          subscriptionId: subscriptionId,
        });

      await interaction.followUp(
        formatMessage(`Deleted ${oldSubscription.name}!`, {
          replyType: InteractionReplyType.success,
        })
      );
    } catch (e) {
      let message: string;
      if (e instanceof SubscriptionDoesNotExistError) {
        message = "This subscription doesn't exist!";
      } else {
        logger.error(e);
        message = 'Something weird happened...';
      }
      await interaction.followUp({
        content: formatMessage(message, {
          replyType: InteractionReplyType.error,
        }),
        ephemeral: true,
      });
    }
  }

  @Slash('info', { description: 'Info on a subscription' })
  async info(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptionsWithConfig(),
      type: 'STRING',
    })
    subscriptionId: number,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (!interaction.isCommand()) return;

    try {
      await interaction.deferReply();
      const subscription = await this.subscriptionsDatabase.getSubscription({
        subscriptionId,
      });

      const mentionButton = new MessageButton()
        .setLabel('Mention')
        .setEmoji('🛎')
        .setStyle('PRIMARY')
        .setCustomId(mentionButtonId);
      const mentionRow = new MessageActionRow().addComponents(mentionButton);
      const components: MessageActionRow[] = [];

      const embed = new MessageEmbed();
      embed.setTitle(`${subscription.name}`);
      if (subscription.userIds.length === 0) {
        embed.setDescription(`No one's in ${subscription.name} 😔`);
      } else {
        components.push(mentionRow);
        embed.setDescription(
          `Subscribed users:\n${subscription.userIds
            .map((id) => userMention(id))
            .join('\n')}`
        );
      }
      const unsubscribeButton = new MessageButton()
        .setLabel('Unsubscribe')
        .setEmoji('🔕')
        .setStyle('SECONDARY')
        .setCustomId(unsubscribeButtonId);
      const subscribeButton = new MessageButton()
        .setLabel('Subscribe')
        .setEmoji('🔔')
        .setStyle('SECONDARY')
        .setCustomId(subscribeButtonId);

      const subscribeRow = new MessageActionRow().addComponents(
        subscribeButton,
        unsubscribeButton
      );

      components.push(subscribeRow);
      const message = await interaction.followUp({
        embeds: [formatEmbed(embed, { customPrefix: 'ℹ️' })],
        components,
        fetchReply: true,
      });

      await SubscriptionsMentionMessage.create({
        messageId: message.id,
        subscriptionId: subscriptionId,
      });
    } catch (e) {
      let message: string;
      if (e instanceof SubscriptionDoesNotExistError) {
        message = "This subscription doesn't exist!";
      } else {
        logger.error(e);
        message = 'Something weird happened...';
      }
      await interaction.followUp({
        content: formatMessage(message, {
          replyType: InteractionReplyType.error,
        }),
        ephemeral: true,
      });
    }
  }

  @Slash('me', { description: "Lists subscriptions I'm subscribed to" })
  @SlashGroup('list')
  async listMe(interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const allSubscriptions = await this.subscriptionsDatabase.listForGuild({
      guildId: interaction.guildId,
    });
    const userId = interaction.member.user.id;
    const filteredSubscriptions = allSubscriptions.filter((s) =>
      s.userIds.includes(userId)
    );

    const noSubscriptions = filteredSubscriptions.length == 0;

    const embed = createEmbedForListingSubscriptions({
      subscriptions: filteredSubscriptions,
      serverNameOrUserName: interaction.member.user.username,
      noSubscriptionsMessage:
        "You're not in any subscriptions! Try joining one with `/subscription join`",
    });

    await interaction.followUp({
      embeds: [
        formatEmbed(embed, {
          ...(noSubscriptions
            ? { replyType: InteractionReplyType.warn }
            : { customPrefix: '📝' }),
        }),
      ],
      ephemeral: true,
    });
  }

  @Slash('server', { description: 'Lists subscriptions in this server' })
  @SlashGroup('list')
  async listServer(interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply();
    const allSubscriptions = await this.subscriptionsDatabase.listForGuild({
      guildId: interaction.guildId,
    });
    if (!interaction.guild) {
      await interaction.followUp({
        content: formatMessage('You should be using this in a guild!', {
          replyType: InteractionReplyType.warn,
        }),
        ephemeral: true,
      });
      return;
    }

    const noSubscriptions = allSubscriptions.length == 0;

    const embed = createEmbedForListingSubscriptions({
      subscriptions: allSubscriptions,
      serverNameOrUserName: interaction.guild.name,
      noSubscriptionsMessage:
        'This server has no subscriptions! Try creating one with `/subscriptions create`',
    });
    await interaction.followUp({
      embeds: [
        formatEmbed(embed, {
          ...(noSubscriptions
            ? { replyType: InteractionReplyType.warn }
            : { customPrefix: '📝' }),
        }),
      ],
    });
  }

  @Slash('mention', { description: 'Mentions all users in a subscription' })
  async mention(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptionsWithConfig(),
      type: 'STRING',
    })
    subscriptionId: number,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (!interaction.isCommand()) return;
    try {
      const simpleSubscription =
        await this.subscriptionsDatabase.getSubscription({
          subscriptionId: subscriptionId,
        });

      const messagePayload = getMentionMessagePayload({
        subscription: simpleSubscription,
        interaction,
      });

      const message = await interaction.reply(messagePayload);

      await SubscriptionsMentionMessage.create({
        messageId: message.id,
        subscriptionId: subscriptionId,
      });
    } catch (e) {
      let message = 'Something weird happened...';
      if (e instanceof SubscriptionDoesNotExistError) {
        message = "That subscription doesn't exist!";
      } else {
        logger.error(e);
      }
      interaction.reply({
        content: formatMessage(message, {
          replyType: InteractionReplyType.error,
        }),
        ephemeral: true,
      });
    }
  }

  @ButtonComponent(unsubscribeButtonId)
  async unsubscribeBtn(interaction: ButtonInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const subscription =
        await this.subscriptionsDatabase.getSubscriptionForMessage({
          messageId: interaction.message.id,
        });
      await this.subscriptionsDatabase.unsubscribeUser({
        userId: interaction.user.id,
        subscriptionId: subscription.id,
      });
      interaction.followUp({
        content: formatMessage(`Unsubscribed to ${subscription.name}!`, {
          replyType: InteractionReplyType.success,
        }),
        ephemeral: true,
      });
    } catch (e) {
      let message: string;
      if (e instanceof SubscriptionDoesNotExistError) {
        message = "This subscription doesn't exist anymore!";
      } else if (e instanceof UserNotSubscribedError) {
        message = "You're not subscribed to this subscription!";
      } else {
        logger.error(e);
        message = 'Something weird happened...';
      }
      interaction.followUp({
        content: formatMessage(message, {
          replyType: InteractionReplyType.error,
        }),
        ephemeral: true,
      });
    }
  }

  @ButtonComponent(subscribeButtonId)
  async subscribeBtn(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const subscription =
        await this.subscriptionsDatabase.getSubscriptionForMessage({
          messageId: interaction.message.id,
        });
      await this.subscriptionsDatabase.subscribeUser({
        userId: interaction.user.id,
        subscriptionId: subscription.id,
      });
      interaction.followUp({
        content: formatMessage(`Subscribed to ${subscription.name}!`, {
          replyType: InteractionReplyType.success,
        }),
        ephemeral: true,
      });
    } catch (e) {
      let message: string;
      if (e instanceof SubscriptionDoesNotExistError) {
        message = "This subscription doesn't exist anymore!";
      } else if (e instanceof UserAlreadySubscribedError) {
        message = "You're already subscribed!";
      } else {
        logger.error(e);
        message = 'Something weird happened...';
      }
      interaction.followUp({
        content: formatMessage(message, {
          replyType: InteractionReplyType.error,
        }),
        ephemeral: true,
      });
    }
  }

  @ButtonComponent(acceptButtonId)
  async acceptBtn(interaction: ButtonInteraction) {
    await modifyReplyEmbedAcceptanceForUser({
      interaction,
      newValue: AcceptanceState.accepted,
    });
  }

  @ButtonComponent(declineButtonId)
  async declineBtn(interaction: ButtonInteraction) {
    await modifyReplyEmbedAcceptanceForUser({
      interaction,
      newValue: AcceptanceState.declined,
    });
  }

  @ButtonComponent(mentionButtonId)
  async mentionBtn(interaction: ButtonInteraction) {
    try {
      const subscription =
        await this.subscriptionsDatabase.getSubscriptionForMessage({
          messageId: interaction.message.id,
        });

      const messagePayload = getMentionMessagePayload({
        subscription,
        interaction,
      });

      const message = await interaction.reply(messagePayload);

      await SubscriptionsMentionMessage.create({
        messageId: message.id,
        subscriptionId: subscription.id,
      });
    } catch (e) {
      let message = 'Something weird happened...';
      if (e instanceof SubscriptionDoesNotExistError) {
        message = "That subscription doesn't exist!";
      } else {
        logger.error(e);
      }
      interaction.reply({
        content: formatMessage(message, {
          replyType: InteractionReplyType.error,
        }),
        ephemeral: true,
      });
    }
  }
}

function getMentionMessagePayload({
  subscription,
  interaction,
}: {
  subscription: ClientSubscription;
  interaction: Interaction;
}): InteractionReplyOptions & { fetchReply: true } {
  const embed = createEmbedForMentioningSubscriptions({
    callee: interaction.user,
    subscription,
  });

  const declineButton = new MessageButton()
    .setLabel('Decline')
    .setEmoji('❎')
    .setStyle('DANGER')
    .setCustomId(declineButtonId);
  const acceptButton = new MessageButton()
    .setLabel('Accept')
    .setEmoji('✅')
    .setStyle('PRIMARY')
    .setCustomId(acceptButtonId);
  const unsubscribeButton = new MessageButton()
    .setLabel('Unsubscribe')
    .setEmoji('🔕')
    .setStyle('SECONDARY')
    .setCustomId(unsubscribeButtonId);
  const subscribeButton = new MessageButton()
    .setLabel('Subscribe')
    .setEmoji('🔔')
    .setStyle('SECONDARY')
    .setCustomId(subscribeButtonId);

  const firstRow = new MessageActionRow().addComponents(
    acceptButton,
    declineButton
  );
  const secondRow = new MessageActionRow().addComponents(
    subscribeButton,
    unsubscribeButton
  );

  const opts: InteractionReplyOpts = {
    replyType: InteractionReplyType.success,
    customPrefix: '🔔',
  };

  // Mentions don't work with `followUp`
  return {
    // TODO: Use role
    content:
      subscription.userIds.length > 0
        ? subscription.userIds.map((id) => userMention(id)).join(' ')
        : undefined,
    embeds: [formatEmbed(embed, opts)],
    components: [firstRow, secondRow],
    allowedMentions: { parse: ['users', 'everyone'] },
    fetchReply: true,
  };
}

async function modifyReplyEmbedAcceptanceForUser({
  interaction,
  newValue,
}: {
  interaction: ButtonInteraction;
  newValue: AcceptanceState;
}) {
  await interaction.deferUpdate();
  const originalReply = await interaction.fetchReply();

  const messageMalformedMessage = {
    content: formatMessage(
      "This message was malformed... we're getting rid of it.",
      { replyType: InteractionReplyType.warn }
    ),
    ephemeral: true,
  };
  if (originalReply.embeds.length !== 1) {
    await interaction.followUp(messageMalformedMessage);
    await interaction.deleteReply();
    return;
  }
  const embed = originalReply.embeds[0];
  const user = interaction.user;

  if (!embed.fields) {
    await interaction.followUp(messageMalformedMessage);
    await interaction.deleteReply();
    return;
  }
  const fieldIndex = embed.fields.findIndex(
    ({ value }) => value === userMention(user.id)
  );

  // Allow users who weren't in the mention originally to accept
  if (fieldIndex === -1) {
    embed.fields.push({
      value: userMention(user.id),
      name: newValue,
      inline: true,
    });
  } else {
    embed.fields[fieldIndex] = {
      ...embed.fields[fieldIndex],
      name: newValue,
    };
  }

  await interaction.editReply({ embeds: [embed] });
}

function createEmbedForMentioningSubscriptions({
  callee,
  subscription,
}: {
  callee: User;
  subscription: ClientSubscription;
}): MessageEmbed {
  const { name, userIds } = subscription;
  const embed = new MessageEmbed();
  embed.setTitle(name);
  embed.setAuthor(callee.username, callee.displayAvatarURL());
  if (userIds.length > 0) {
    embed.setDescription(`${bold(callee.username)} has mentioned you!`);
    const fields: EmbedField[] = userIds.map((id) => ({
      inline: true,
      name:
        id !== callee.id ? AcceptanceState.pending : AcceptanceState.accepted,
      value: userMention(id),
    }));
    embed.setFields(fields);
  } else {
    embed.setDescription(
      `${bold(callee.username)} has mentioned ${name}... but no one's in here.`
    );
  }
  embed.setFooter(
    formatMessage(
      'If you would like to be mentioned for this next time, click to subscribe below!',
      { customPrefix: '💡' }
    )
  );
  return embed;
}

function createEmbedForListingSubscriptions({
  subscriptions,
  serverNameOrUserName,
  noSubscriptionsMessage,
}: {
  subscriptions: ClientSubscription[];
  serverNameOrUserName: string;
  noSubscriptionsMessage: string;
}): MessageEmbed {
  const embed = new MessageEmbed();
  const noSubscriptions = subscriptions.length === 0;

  const title = `${serverNameOrUserName}'s subscriptions`;
  embed.setTitle(title);

  if (noSubscriptions) embed.setDescription(noSubscriptionsMessage);

  const fields: EmbedFieldData[] = subscriptions.map(
    ({ name, userIds }): EmbedFieldData => ({
      name,
      value: `${userIds.length} users`,
      inline: true,
    })
  );
  embed.setFields(fields);
  return embed;
}

function autocompleteSubscriptionsWithConfig(
  opts: Partial<{
    limitToUserSubscribed: boolean;
    limitToUserUnsubscribed: boolean;
  }> = {}
): (
  this: Subscriptions,
  interaction: AutocompleteInteraction
) => Promise<void> {
  return async function ac(
    this: Subscriptions,
    interaction: AutocompleteInteraction
  ) {
    const query: string | number = interaction.options.getFocused();

    const subscriptions = await this.subscriptionsDatabase.listForGuild({
      guildId: interaction.guildId,
    });
    let filteredSubscriptions = querySubscriptions(
      query.toString(),
      subscriptions
    );
    if (opts.limitToUserSubscribed) {
      filteredSubscriptions = filteredSubscriptions.filter((s) =>
        s.userIds.includes(interaction.user.id)
      );
    }
    if (opts.limitToUserUnsubscribed) {
      filteredSubscriptions = filteredSubscriptions.filter(
        (s) => !s.userIds.includes(interaction.user.id)
      );
    }

    const choices: ApplicationCommandOptionChoice[] = filteredSubscriptions.map(
      (s): ApplicationCommandOptionChoice => ({
        name: s.name,
        value: s.id.toString(),
      })
    );
    interaction.respond(choices);
  };
}
