import { Discord, Slash, SlashGroup, SlashOption } from 'discordx';
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
  subscribe(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptions,
      type: 'STRING',
    })
    subscriptionId: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): void {
    if (!interaction.isAutocomplete()) {
      this.subscriptionsDatabase.subscribeUser({
        userId: parseInt(interaction.member.user.id, 10),
        subscriptionId: parseInt(subscriptionId, 10),
      });
      interaction.reply(`Subscribed!`);
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
    const filteredSubscriptions = (
      await this.subscriptionsDatabase.listForGuild({
        guildId: interaction.guildId,
      })
    ).filter((s) =>
      s.userIds.includes(parseInt(interaction.member.user.id), 10)
    );
    interaction.reply(`${filteredSubscriptions.join(', ')}`);
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
