import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
import { UserSubscriptionError } from '../../libs/subscriptions/subscriptionsErrors';
import {
  ApplicationCommandOptionChoice,
  AutocompleteInteraction,
  CommandInteraction,
} from 'discord.js';
import {
  ISubscriptionsDatabase,
  SQLSubscriptionsDatabase,
} from '../../libs/subscriptions/database';

@Discord()
@SlashGroup('subscriptions')
class Subscriptions {
  subscriptionsDatabase: ISubscriptionsDatabase;

  constructor() {
    this.subscriptionsDatabase = new SQLSubscriptionsDatabase();
  }

  // https://discord-ts.js.org/docs/decorators/commands/slashoption#autocomplete-option
  @Slash('subscribe')
  async subscribe(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptions,
      type: 'STRING',
    })
    subscriptionId: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): Promise<void> {
    if (!interaction.isAutocomplete()) {
      try {
        await this.subscriptionsDatabase.subscribeUser({
          userId: parseInt(interaction.member.user.id, 10),
          subscriptionId: parseInt(subscriptionId, 10),
        });
        interaction.reply(`Subscribed!`);
      } catch (e) {
        if (e instanceof UserSubscriptionError) {
          interaction.reply("You're already subscribed!");
        }
      }
    }
  }

  @Slash('create')
  create(
    @SlashOption('name', {
      autocomplete: false,
      type: 'STRING',
    })
    name: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): void {
    if (!interaction.isAutocomplete()) {
      this.subscriptionsDatabase.createSubscription({
        guildId: interaction.guildId,
        subscriptionName: name,
      });
      interaction.reply(`Created ${name}`);
    }
  }

  @Slash('unsubscribe', { description: 'Unsubscribes to a subscription' })
  unsubscribe(
    @SlashOption('subscription', {
      autocomplete: false,
      type: 'STRING',
    })
    subscriptionId: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): void {
    if (!interaction.isAutocomplete()) {
      this.subscriptionsDatabase.unsubscribeUser({
        userId: parseInt(interaction.member.user.id, 10),
        subscriptionId: parseInt(subscriptionId, 10),
      });
      interaction.reply(`Unsubscribed!`);
    }
  }

  @Slash('delete', { description: 'Deletes a subscription' })
  delete(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptions,
      type: 'STRING',
    })
    subscriptionId: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): void {
    if (!interaction.isAutocomplete()) {
      this.subscriptionsDatabase.deleteSubscription({
        subscriptionId: parseInt(subscriptionId, 10),
      });
      interaction.reply(`Deleted!`);
    }
  }

  @Slash('listme', { description: "List subscriptions I'm subscribed to" })
  async listme(interaction: CommandInteraction): Promise<void> {
    const allSubscriptions = await this.subscriptionsDatabase.listForGuild({
      guildId: interaction.guildId,
    });
    console.log(allSubscriptions, parseInt(interaction.member.user.id));
    const userId = parseInt(interaction.member.user.id, 10);
    const filteredSubscriptions = allSubscriptions.filter((s) =>
      s.userIds.includes(userId)
    );
    interaction.reply(
      `You're in: ${filteredSubscriptions.map((s) => s.name).join(', ')}`
    );
  }
}

/**
 * Resolves autocompleting a query for the subscriptions
 *
 * TODO: Implement filtering logic
 */
async function autocompleteSubscriptions(
  this: Subscriptions,
  interaction: AutocompleteInteraction
) {
  const query: string | number = interaction.options.getFocused();

  const subscriptions = await this.subscriptionsDatabase.listForGuild({
    guildId: interaction.guildId,
  });
  const choices: ApplicationCommandOptionChoice[] = subscriptions.map(
    (s): ApplicationCommandOptionChoice => ({
      name: s.name,
      value: s.id.toString(),
    })
  );
  interaction.respond(choices);
}
