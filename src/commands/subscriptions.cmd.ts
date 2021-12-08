import { Discord, Slash, SlashOption } from 'discordx';
import { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import {
  ISubscriptionsDatabase,
  TestSubscriptionsDatabase,
} from '../libs/subscriptions/database';

@Discord()
class Subscriptions {
  subscriptionsDatabase: ISubscriptionsDatabase;

  constructor() {
    // TODO: Change
    this.subscriptionsDatabase = new TestSubscriptionsDatabase();
  }

  // https://discord-ts.js.org/docs/decorators/commands/slashoption#autocomplete-option
  @Slash('subscribe')
  testx(
    @SlashOption('subscription', {
      autocomplete: autocompleteSubscriptions,
      type: 'STRING',
    })
    searchText: string,
    interaction: CommandInteraction | AutocompleteInteraction
  ): void {
    // autocomplete will passed to function if not handle above
    if (interaction.isAutocomplete()) {
      const focusedOption = interaction.options.getFocused(true);
      // resolver for option a
      if (focusedOption.name === 'aoption') {
        interaction.respond([
          { name: 'option a', value: 'a' },
          { name: 'option b', value: 'b' },
        ]);
      }
    } else {
      interaction.reply(`${searchText}`);
    }
  }
  @Slash('add')
  add(
    @SlashOption('x', { description: 'x value' })
    x: number,
    @SlashOption('y', { description: 'y value' })
    y: number,

    interaction: CommandInteraction
  ) {
    interaction.reply(String(x + y));
  }
}

/**
 * Resolves autocompleting a query for the subscriptions
 *
 * TODO: Implement
 */
function autocompleteSubscriptions(
  this: Subscriptions,
  interaction: AutocompleteInteraction
) {
  const query: string | number = interaction.options.getFocused();
  interaction.respond([]);
}
