import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuInteraction,
  SelectMenuInteraction,
} from 'discord.js';
import { GuardFunction } from 'discordx';

export const DefaultCatch: GuardFunction<
  | CommandInteraction
  | ContextMenuInteraction
  | SelectMenuInteraction
  | ButtonInteraction
> = async (arg, client, next, guardDatas) => {
  try {
    await next();
  } catch (e) {
    // TODO: Error logging
    console.error(e);
  }
};
