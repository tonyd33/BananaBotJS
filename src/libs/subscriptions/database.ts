import { AsyncOrSyncReturnT } from '../types';
import { Subscription } from './subscriptions';

export class GuildDoesNotExistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuildDoesNotExistError';
  }
}

export class SubscriptionDoesNotExistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionDoesNotExistError';
  }
}

export interface ISubscriptionsDatabase {
  /**
   * Lists all subscriptions for a guild. If the guild does not exist, throws an
   * error.
   */
  listForGuild: ({
    guildId,
  }: {
    guildId: number;
  }) => AsyncOrSyncReturnT<Subscription[]>;

  /**
   * Subscribes a user to a subscription within a guild and returns the updated
   * subscription. If either the guild or subscription does not exist, throws
   * an error.
   */
  subscribeUser: ({
    guildId,
    userId,
    subscriptionId,
  }: {
    guildId: number;
    userId: number;
    subscriptionId: number;
  }) => AsyncOrSyncReturnT<Subscription>;

  /**
   * Unsubscribes a user to a subscription within a guild and returns the updated
   * subscription. If either the guild or subscription does not exist, throws
   * an error.
   */
  unsubscribeUser: ({
    guildId,
    userId,
    subscriptionId,
  }: {
    guildId: number;
    userId: number;
    subscriptionId: number;
  }) => AsyncOrSyncReturnT<Subscription>;

  /**
   * Creates a subscription and returns the newly created subscription.
   */
  createSubscription: ({
    guildId,
    subscriptionName,
  }: {
    guildId: number;
    subscriptionName: string;
  }) => AsyncOrSyncReturnT<Subscription>;

  /**
   * Deletes a subscription. Throws an error if the subscription does not
   * exist within the guild.
   */
  deleteSubscription: ({
    guildId,
    subscriptionId: number,
  }: {
    guildId: number;
    subscriptionId: number;
  }) => void;
}

// TODO: Implement
export class TestSubscriptionsDatabase implements ISubscriptionsDatabase {
  listForGuild({
    guildId,
  }: {
    guildId: number;
  }): AsyncOrSyncReturnT<Subscription[]> {
    return [];
  }
  subscribeUser({
    guildId,
    userId,
    subscriptionId,
  }: {
    guildId: number;
    userId: number;
    subscriptionId: number;
  }): AsyncOrSyncReturnT<Subscription> {
    return { id: 0, userIds: [userId], name: 'asdf' };
  }
  unsubscribeUser({
    guildId,
    userId,
    subscriptionId,
  }: {
    guildId: number;
    userId: number;
    subscriptionId: number;
  }): AsyncOrSyncReturnT<Subscription> {
    return { id: 0, userIds: [userId], name: 'asdf' };
  }
  createSubscription({
    guildId,
    subscriptionName,
  }: {
    guildId: number;
    subscriptionName: string;
  }): AsyncOrSyncReturnT<Subscription> {
    return { id: 0, userIds: [1234], name: 'asdf' };
  }
  deleteSubscription({
    guildId,
    subscriptionId: number,
  }: {
    guildId: number;
    subscriptionId: number;
  }): void {
    console.log('delete subscription');
  }
}
