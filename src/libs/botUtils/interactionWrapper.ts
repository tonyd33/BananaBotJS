import { MessageEmbed } from 'discord.js';

export enum InteractionReplyType {
  success = 'success',
  error = 'error',
  warn = 'warn',
  none = 'none',
}

const emojiMap: {
  [replyType in Exclude<
    InteractionReplyType,
    InteractionReplyType.none
  >]: string;
} = {
  [InteractionReplyType.success]: '✅',
  [InteractionReplyType.error]: '❌',
  [InteractionReplyType.warn]: '⚠️',
};

export interface InteractionReplyOpts {
  /**
   * To keep consistent styling of messages, we try to specify the reply type here.
   * Defaults to none.
   */
  replyType?: InteractionReplyType;
  /**
   * Whether or not to apply our standard styling to the embed title(s),
   * if there are any. Defaults to true.
   */
  processEmbedTitles?: boolean;
  /** If set, will use this to prefix the message rather than the set emoji. */
  customPrefix?: string;
}

export function formatMessage(
  origMessage: string,
  opts: InteractionReplyOpts
): string {
  const { replyType, customPrefix } = opts;
  if (customPrefix) {
    return `${customPrefix} ${origMessage}`;
  } else if (replyType && replyType !== InteractionReplyType.none) {
    return `${emojiMap[replyType]} ${origMessage}`;
  }
  return origMessage;
}

export function formatEmbed(embed: MessageEmbed, opts: InteractionReplyOpts) {
  if (embed.title) {
    embed.title = formatMessage(embed.title, opts);
  }
  return embed;
}
