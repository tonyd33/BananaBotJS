import {
  CommandInteraction,
  InteractionDeferReplyOptions,
  InteractionReplyOptions,
  MessagePayload,
} from 'discord.js';

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

type OrigReplyPayloadType = string | MessagePayload | InteractionReplyOptions;

function processMessage(
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

function modifyPayload(
  origArg: OrigReplyPayloadType,
  opts: InteractionReplyOpts
): OrigReplyPayloadType {
  const { processEmbedTitles: processEmbedTitleArg } = opts;
  const processEmbedTitle =
    processEmbedTitleArg === undefined || processEmbedTitleArg;
  let payload = origArg;
  if (typeof payload === 'string') {
    payload = processMessage(payload, opts);
  } else {
    if ('content' in payload && payload.content) {
      payload.content = processMessage(payload.content, opts);
    }

    if (
      'embeds' in payload &&
      payload.embeds !== undefined &&
      processEmbedTitle
    ) {
      for (const embed of payload.embeds) {
        if (embed.title) {
          embed.title = processMessage(embed.title, opts);
        }
      }
    }
  }
  return payload;
}

export class WrappedCommandInteraction {
  interaction: CommandInteraction;

  constructor(interaction: CommandInteraction) {
    this.interaction = interaction;
  }

  public async followUp(
    origArg: OrigReplyPayloadType,
    opts: InteractionReplyOpts
  ) {
    const payload = modifyPayload(origArg, opts);
    return this.interaction.followUp(payload);
  }

  public async reply(
    origArg: OrigReplyPayloadType,
    opts: InteractionReplyOpts
  ): Promise<void> {
    const payload = modifyPayload(origArg, opts);
    return this.interaction.reply(payload);
  }
}

export interface WrapCommandInteractionOpts {
  /** Whether or not to defer the reply. Defaults to true. */
  defer?: boolean;
  deferOpts?: InteractionDeferReplyOptions;
}

/**
 * Wraps handling with a command interaction.
 *
 * Main functionalities are:
 * - Error handling
 * - Closing defer handles
 * - Sending consistently styled messages with using `WrappedCommandInteraction`
 *
 * Ex:
 * ```ts
 * function handleInteraction(interaction: CommandInteraction) {
 *    await wrapCommandInteraction({
 *      interaction,
 *      opts: { deferReply: true },
 *      callback: async (wrapped: WrappedCommandInteraction) => {
 *        // query database
 *        // send reply
 *        // try to catch errors, but can rely on this function
 *        // to handle it and close the defer handle
 *      }
 *    })
 * }
 * ```
 * @param interaction
 * @param callback
 * @param opts
 */
export async function wrapCommandInteraction({
  interaction,
  callback,
  opts,
}: {
  interaction: CommandInteraction;
  callback: (wrappedInteraction: WrappedCommandInteraction) => unknown;
  opts: WrapCommandInteractionOpts;
}) {
  const { defer: deferArg, deferOpts } = opts;
  const defer: boolean = deferArg === undefined || deferArg;
  let deferring: boolean = false;

  const wrapped = new WrappedCommandInteraction(interaction);

  try {
    if (!interaction.deferred && defer) {
      await interaction.deferReply(deferOpts);
      deferring = true;
    }
    await callback(wrapped);
  } catch (err) {
    // TODO: Logging error to server
    console.error(err, JSON.stringify(err, null, 2));
    if (interaction.replied) {
      await wrapped.followUp(
        "An unknown error has occurred 😱! We'll look into it. In the meantime, maybe try something else?",
        {
          replyType: InteractionReplyType.error,
        }
      );
    } else {
      await wrapped.reply(
        "An unknown error has occurred 😱! We'll look into it. In the meantime, maybe try something else?",
        {
          replyType: InteractionReplyType.error,
        }
      );
    }
  } finally {
    // Finish the deferral, otherwise we can't do this command interaction for 15 minutes
    // while Discord is waiting.
    if (!interaction.replied && !interaction.deferred && deferring) {
      // TODO: Logging error to server
      await wrapped.followUp(
        "We executed the task, but didn't get a response.",
        {
          replyType: InteractionReplyType.warn,
        }
      );
    }
  }
}
