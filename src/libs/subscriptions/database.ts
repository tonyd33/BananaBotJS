import Guild from '../db/models/Guild';
import Subscription from '../db/models/Subscription';
import User from '../db/models/User';
import { AsyncOrSyncReturnT } from '../types';
import { ClientSubscription } from './subscriptions';
import { SubscriptionInstance } from '../db/models/Subscription';
import SubscriptionUsers from '../db/junctionModels/SubscriptionUsers';
import { UserAttributes } from '../db/models/User';
import {
  UserAlreadySubscribedError,
  UserNotSubscribedError,
} from './subscriptionsErrors';
import SubscriptionsMentionMessage from '../db/models/SubscriptionsMentionMessage';
import { SubscriptionsMentionMessageInstance } from '../db/models/SubscriptionsMentionMessage';
import {
  SubscriptionDoesNotExistError,
  SubscriptionExistsError,
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
  }) => AsyncOrSyncReturnT<ClientSubscription[]>;

  /**
   * Subscribes a user to a subscription within a guild and returns the updated
   * subscription. If either the guild or subscription does not exist, throws
   * an error.
   */
  subscribeUser: ({
    userId,
    subscriptionId,
  }: {
    userId: string;
    subscriptionId: number;
  }) => AsyncOrSyncReturnT<ClientSubscription>;

  /**
   * Unsubscribes a user to a subscription within a guild and returns the updated
   * subscription. If either the guild or subscription does not exist, throws
   * an error.
   */
  unsubscribeUser: ({
    userId,
    subscriptionId,
  }: {
    userId: string;
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
  }) => AsyncOrSyncReturnT<ClientSubscription>;

  /**
   * Deletes a subscription. Throws an error if the subscription does not
   * exist within the guild.
   */
  deleteSubscription: ({
    subscriptionId,
  }: {
    subscriptionId: number;
  }) => AsyncOrSyncReturnT<ClientSubscription>;

  /**
   * Gets the subscription with this id. If not found, will throw a
   * `SubscriptionDoesNotExistError`
   */
  getSubscription: ({
    subscriptionId,
  }: {
    subscriptionId: number;
  }) => AsyncOrSyncReturnT<ClientSubscription>;

  getSubscriptionForMessage: ({
    messageId,
  }: {
    messageId: string;
  }) => AsyncOrSyncReturnT<ClientSubscription>;
}

export interface SubscriptionInstanceWithUsers extends SubscriptionInstance {
  users: UserAttributes[];
}

function subscriptionToClientSubscription(
  subscription: SubscriptionInstanceWithUsers
): ClientSubscription {
  return {
    id: subscription.id,
    userIds: subscription.users.map((user) => user.id),
    name: subscription.name,
  };
}

const whereSubscriptionsWithUsers = {
  include: [{ model: User, as: 'users', attributes: ['id'] }],
};

export class SQLSubscriptionsDatabase implements ISubscriptionsDatabase {
  async listForGuild({
    guildId,
  }: {
    guildId: string;
  }): Promise<ClientSubscription[]> {
    const subscriptionInstances = (await Subscription.findAll({
      ...whereSubscriptionsWithUsers,
      attributes: ['id', 'name'],
      where: { guildId },
    })) as SubscriptionInstanceWithUsers[];

    return subscriptionInstances.map(subscriptionToClientSubscription);
  }

  async subscribeUser({
    userId,
    subscriptionId,
  }: {
    userId: string;
    subscriptionId: number;
  }): Promise<ClientSubscription> {
    const subscription = (await Subscription.findByPk(subscriptionId, {
      ...whereSubscriptionsWithUsers,
      attributes: ['id', 'name'],
    })) as SubscriptionInstanceWithUsers | null;
    if (!subscription) {
      throw new SubscriptionDoesNotExistError();
    } else if (subscription.users.map((u) => u.id).includes(userId)) {
      throw new UserAlreadySubscribedError();
    }

    await Promise.all([
      User.upsert({ id: userId }),
      SubscriptionUsers.upsert({ subscriptionId: subscription.id, userId }),
    ]);

    await subscription.reload();

    return subscriptionToClientSubscription(subscription);
  }

  async unsubscribeUser({
    userId,
    subscriptionId,
  }: {
    userId: string;
    subscriptionId: number;
  }): Promise<void> {
    const subscription = await SubscriptionUsers.findOne({
      where: { userId, subscriptionId },
    });
    if (!subscription) {
      throw new UserNotSubscribedError();
    }
    await subscription.destroy();
  }

  async createSubscription({
    guildId,
    subscriptionName,
  }: {
    guildId: string;
    subscriptionName: string;
  }): Promise<ClientSubscription> {
    const subscription = (await Subscription.findOne({
      ...whereSubscriptionsWithUsers,
      where: { name: subscriptionName, guildId },
      attributes: ['id', 'name'],
    })) as SubscriptionInstanceWithUsers | null;
    if (subscription) {
      throw new SubscriptionExistsError();
    }

    // TODO: There should be a way to do the following in one transaction
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
  }): Promise<ClientSubscription> {
    const subscription = (await Subscription.findByPk(subscriptionId, {
      ...whereSubscriptionsWithUsers,
    })) as SubscriptionInstanceWithUsers;
    if (!subscription) {
      throw new SubscriptionDoesNotExistError();
    }
    await subscription.destroy();
    return subscriptionToClientSubscription(subscription);
  }

  async getSubscription({
    subscriptionId,
  }: {
    subscriptionId: number;
  }): Promise<ClientSubscription> {
    const subscription = (await Subscription.findByPk(subscriptionId, {
      include: [{ model: User, as: 'users', attributes: ['id'] }],
    })) as SubscriptionInstanceWithUsers;
    if (!subscription) throw new SubscriptionDoesNotExistError();

    return subscriptionToClientSubscription(subscription);
  }

  async getSubscriptionForMessage({
    messageId,
  }: {
    messageId: string;
  }): Promise<ClientSubscription> {
    const subscriptionsMentionMessage =
      (await SubscriptionsMentionMessage.findByPk(messageId, {
        include: [
          {
            model: Subscription,
            attributes: ['id', 'name'],
            include: [{ model: User, as: 'users', attributes: ['id'] }],
          },
        ],
      })) as
        | (SubscriptionsMentionMessageInstance & {
            Subscription: SubscriptionInstanceWithUsers;
          })
        | null;
    if (
      !subscriptionsMentionMessage ||
      !subscriptionsMentionMessage.Subscription
    ) {
      throw new SubscriptionDoesNotExistError();
    }
    const { id, users, name } = subscriptionsMentionMessage.Subscription;
    return { id, name, userIds: users.map((u) => u.id) };
  }
}
