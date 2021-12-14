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
  SimpleSubscription,
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
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  User,
} from 'discord.js';
import {
  ISubscriptionsDatabase,
  SQLSubscriptionsDatabase,
} from '../../libs/subscriptions/database';
import { InteractionReplyType } from '../../libs/botUtils/interactionWrapper';
import { bold, userMention } from '@discordjs/builders';
import { APIEmbedField } from 'discord-api-types';
import SubscriptionsMentionMessage from '../../libs/db/models/SubscriptionsMentionMessage';
import { UserNotSubscribedError } from '../../libs/subscriptions/subscriptionsErrors';

enum AcceptanceState {
  accepted = '🟢',
  declined = '🔴',
  pending = '🟠',
}

const acceptButtonId = 'accept-btn';
const declineButtonId = 'decline-btn';
const subscribeButtonId = 'subscribe-btn';
const unsubscribeButtonId = 'unsubscribe-btn';

@Discord()
@SlashGroup('subscriptions', 'Subscriptions', {
  list: 'List-type commands',
})
export abstract class Subscriptions {
  subscriptionsDatabase: ISubscriptionsDatabase;

  constructor() {
    this.subscriptionsDatabase = new SQLSubscriptionsDatabase();
  }

  // https://discord-ts.js.org/docs/decorators/commands/slashoption#autocomplete-option
  @Slash('join', { description: 'Subscribes to a subscription' })
  async join(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptions,
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
      autocomplete: autocompleteSubscriptions,
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
      autocomplete: autocompleteSubscriptions,
      type: 'STRING',
    })
    subscriptionId: number,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (!interaction.isCommand()) return;

    try {
      await interaction.deferReply();
      await this.subscriptionsDatabase.deleteSubscription({
        subscriptionId: subscriptionId,
      });
      // TODO: Get subscription name before deletion and send it
      await interaction.followUp(
        formatMessage('Deleted the subscription!', {
          replyType: InteractionReplyType.success,
        })
      );
    } catch (e) {
      let message: string;
      if (e instanceof SubscriptionDoesNotExistError) {
        message = "This subscription doesn't exist!";
      } else {
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
      username: interaction.member.user.username,
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

    const noSubscriptions = allSubscriptions.length == 0;

    const embed = createEmbedForListingSubscriptions({
      subscriptions: allSubscriptions,
      username: interaction.member.user.username,
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
      autocomplete: autocompleteSubscriptions,
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

      const embed = createEmbedForMentioningSubscriptions({
        callee: interaction.user,
        subscription: simpleSubscription,
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
      const message = await interaction.reply({
        // TODO: Use role
        content: formatMessage(
          `${simpleSubscription.userIds
            .map((id) => userMention(id))
            .join(' ')}`,
          opts
        ),
        embeds: [formatEmbed(embed, opts)],
        components: [firstRow, secondRow],
        allowedMentions: { parse: ['users', 'everyone'] },
        fetchReply: true,
      });

      await SubscriptionsMentionMessage.create({
        messageId: message.id,
        subscriptionId: subscriptionId,
      });
    } catch (e) {
      interaction.followUp({
        content: formatMessage('Something weird happened...', {
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
}

// TODO: Have `newValue` as enum and use map off of it
async function modifyReplyEmbedAcceptanceForUser({
  interaction,
  newValue,
}: {
  interaction: ButtonInteraction;
  newValue: string;
}) {
  await interaction.deferUpdate();
  const originalReply = await interaction.fetchReply();
  // TODO: More graceful handling
  if (originalReply.embeds.length !== 1) {
    await interaction.deleteReply();
    return;
  }
  const embed = originalReply.embeds[0];
  const user = interaction.user;

  // TODO: More graceful handling
  if (!embed.fields) return;

  embed.fields = embed.fields.map((prev: APIEmbedField) => ({
    ...prev,
    name: prev.value.includes(user.id) ? newValue : prev.name,
  }));
  await interaction.editReply({ embeds: [embed] });
}

function createEmbedForMentioningSubscriptions({
  callee,
  subscription,
}: {
  callee: User;
  subscription: SimpleSubscription;
}): MessageEmbed {
  const { name, userIds } = subscription;
  const embed = new MessageEmbed();
  embed.setTitle(name);
  embed.setDescription(`${bold(callee.username)} has mentioned you!`);
  const fields: EmbedField[] = userIds.map((id) => ({
    inline: true,
    // TODO: Use enum values
    name: id !== callee.id ? AcceptanceState.pending : AcceptanceState.accepted,
    value: userMention(id),
  }));
  embed.setFields(fields);
  // TODO: Implement
  // embed.setFooter(
  //   'If you would like to be mentioned for this next time, click to subscribe below!'
  // );
  return embed;
}

function createEmbedForListingSubscriptions({
  subscriptions,
  username,
  noSubscriptionsMessage,
}: {
  subscriptions: SimpleSubscription[];
  username: string;
  noSubscriptionsMessage: string;
}): MessageEmbed {
  const embed = new MessageEmbed();
  const noSubscriptions = subscriptions.length === 0;

  const title = `${username}'s subscriptions`;
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

/**
 * Resolves autocompleting a query for the subscriptions
 */
async function autocompleteSubscriptions(
  this: Subscriptions,
  interaction: AutocompleteInteraction
) {
  const query: string | number = interaction.options.getFocused();

  const subscriptions = await this.subscriptionsDatabase.listForGuild({
    guildId: interaction.guildId,
  });
  const filteredSubscriptions = querySubscriptions(
    query.toString(),
    subscriptions
  );

  const choices: ApplicationCommandOptionChoice[] = filteredSubscriptions.map(
    (s): ApplicationCommandOptionChoice => ({
      name: s.name,
      value: s.id.toString(),
    })
  );
  interaction.respond(choices);
}
