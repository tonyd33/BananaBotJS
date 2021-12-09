import Guild from '../db/models/Guild';
import Subscription from '../db/models/Subscription';
import User from '../db/models/User';
import { AsyncOrSyncReturnT } from '../types';
import { SimpleSubscription } from './subscriptions';
import { SubscriptionInstance } from '../db/models/Subscription';
import SubscriptionUsers from '../db/junctionModels/SubscriptionUsers';
import { UserAttributes } from '../db/models/User';
import {
  SubscriptionDoesNotExistError,
  SubscriptionExistsError,
  UserSubscriptionError,
} from './subscriptionsErrors';

/**
 * An interface for managing a connection to the database. Exists as
 * an interface rather than just have a set of functions so that subclasses
 * can statefully implement this. For example, it may be useful to have
 * a class that keeps a small cache of the database in memory in case
 * transactions cannot be executed in parallel, as in the case of SQLite
 */
export interface ISubscriptionsDatabase {
  /**
   * Lists all subscriptions for a guild. If the guild does not exist, throws an
   * error.
   */
  listForGuild: ({
    guildId,
  }: {
    guildId: string;
  }) => AsyncOrSyncReturnT<SimpleSubscription[]>;

  /**
   * Subscribes a user to a subscription within a guild and returns the updated
   * subscription. If either the guild or subscription does not exist, throws
   * an error.
   */
  subscribeUser: ({
    userId,
    subscriptionId,
  }: {
    userId: number;
    subscriptionId: number;
  }) => AsyncOrSyncReturnT<SimpleSubscription>;

  /**
   * Unsubscribes a user to a subscription within a guild and returns the updated
   * subscription. If either the guild or subscription does not exist, throws
   * an error.
   */
  unsubscribeUser: ({
    userId,
    subscriptionId,
  }: {
    userId: number;
    subscriptionId: number;
  }) => AsyncOrSyncReturnT<void>;

  /**
   * Creates a subscription and returns the newly created subscription.
   */
  createSubscription: ({
    guildId,
    subscriptionName,
  }: {
    guildId: string;
    subscriptionName: string;
  }) => AsyncOrSyncReturnT<SimpleSubscription>;

  /**
   * Deletes a subscription. Throws an error if the subscription does not
   * exist within the guild.
   */
  deleteSubscription: ({ subscriptionId }: { subscriptionId: number }) => void;
}

export interface SubscriptionInstanceWithUsers extends SubscriptionInstance {
  users: UserAttributes[];
}

export class SQLSubscriptionsDatabase implements ISubscriptionsDatabase {
  async listForGuild({
    guildId,
  }: {
    guildId: string;
  }): Promise<SimpleSubscription[]> {
    const subscriptionInstances = (await Subscription.findAll({
      attributes: ['id', 'name'],
      where: { guildId },
      include: [{ model: User, as: 'users', attributes: ['id'] }],
    })) as SubscriptionInstanceWithUsers[];

    return subscriptionInstances.map(
      (s): SimpleSubscription => ({
        id: s.id,
        userIds: s.users.map((u) => u.id),
        name: s.name,
      })
    );
  }

  async subscribeUser({
    userId,
    subscriptionId,
  }: {
    userId: number;
    subscriptionId: number;
  }): Promise<SimpleSubscription> {
    const subscription = (await Subscription.findByPk(subscriptionId, {
      attributes: ['id', 'name'],
      include: [{ model: User, as: 'users', attributes: ['id'] }],
    })) as SubscriptionInstanceWithUsers | null;
    if (!subscription) {
      throw new SubscriptionDoesNotExistError();
    } else if (subscription.users.map((u) => u.id).includes(userId)) {
      throw new UserSubscriptionError();
    }

    await Promise.all([
      User.upsert({ id: userId }),
      SubscriptionUsers.upsert({ subscriptionId: subscription.id, userId }),
    ]);

    await subscription.reload();

    return {
      id: subscription.id,
      userIds: subscription.users.map((user) => user.id),
      name: subscription.name,
    };
  }

  async unsubscribeUser({
    userId,
    subscriptionId,
  }: {
    userId: number;
    subscriptionId: number;
  }): Promise<void> {
    await SubscriptionUsers.destroy({ where: { userId, subscriptionId } });
  }

  async createSubscription({
    guildId,
    subscriptionName,
  }: {
    guildId: string;
    subscriptionName: string;
  }): Promise<SimpleSubscription> {
    const subscription = (await Subscription.findOne({
      where: { name: subscriptionName },
      attributes: ['id', 'name'],
      include: [{ model: User, as: 'users', attributes: ['id'] }],
    })) as SubscriptionInstanceWithUsers | null;
    if (subscription) {
      throw new SubscriptionExistsError();
    }

    // TODO (P2 Polish): There should be a way to do the following in one transaction
    await Guild.upsert({ id: guildId });
    const newSubscription = await Subscription.create({
      name: subscriptionName,
      guildId,
    });

    return { id: newSubscription.id, userIds: [], name: newSubscription.name };
  }

  async deleteSubscription({
    subscriptionId,
  }: {
    subscriptionId: number;
  }): Promise<void> {
    await Subscription.destroy({ where: { id: subscriptionId } });
  }
}
