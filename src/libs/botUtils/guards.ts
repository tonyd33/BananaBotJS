import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuInteraction,
  SelectMenuInteraction,
} from 'discord.js';
import { GuardFunction } from 'discordx';
import logger from '../logger';

export const DefaultCatch: GuardFunction<
  | CommandInteraction
  | ContextMenuInteraction
  | SelectMenuInteraction
  | ButtonInteraction
> = async (arg, client, next, guardDatas) => {
  try {
    await next();
  } catch (e) {
    logger.error(e);
  }
};
