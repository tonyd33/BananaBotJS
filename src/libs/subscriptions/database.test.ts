import Guild from '../db/models/Guild';
import Subscription from '../db/models/Subscription';
import {
  SQLSubscriptionsDatabase,
  SubscriptionInstanceWithUsers,
} from './database';
import { truncateTables } from '../../tests/truncateTables';
import { GuildInstance } from '../db/models/Guild';
import {
  UserSubscriptionError,
  SubscriptionDoesNotExistError,
} from './subscriptionsErrors';
import SubscriptionUsers from '../db/junctionModels/SubscriptionUsers';
import User from '../db/models/User';
import { UserNotSubscribedError } from './subscriptionsErrors';

describe(SQLSubscriptionsDatabase, () => {
  const subscriptionsDatabase = new SQLSubscriptionsDatabase();

  let guild: GuildInstance;
  beforeEach(async () => {
    await truncateTables([Guild, Subscription]);
    guild = await Guild.create({ id: '1234' });
  });

  it('lists guilds correctly', async () => {
    const { id: guildId } = guild;
    const subscriptions = await Promise.all([
      Subscription.create({
        name: 'subscription1',
        guildId,
      }),
      await Subscription.create({
        name: 'subscription2',
        guildId,
      }),
    ]);

    const subscriptionsForGuild = await subscriptionsDatabase.listForGuild({
      guildId,
    });
    for (const subscription of subscriptions) {
      expect(
        subscriptionsForGuild.find((s) => s.id === subscription.id)
      ).toBeTruthy();
    }
  });

  it('subscribes a user to a guild successfully', async () => {
    const { id: guildId } = guild;
    const subscription = await Subscription.create({
      name: 'subscription1',
      guildId,
    });
    await Promise.all(
      [1, 2, 3].map((i) =>
        subscriptionsDatabase.subscribeUser({
          userId: i.toString(),
          subscriptionId: subscription.id,
        })
      )
    );
    const updatedSimpleSubscription = await subscriptionsDatabase.subscribeUser(
      {
        userId: '4',
        subscriptionId: subscription.id,
      }
    );
    expect(updatedSimpleSubscription).toMatchObject({
      id: subscription.id,
      name: subscription.name,
    });

    expect(updatedSimpleSubscription.userIds).toHaveLength(4);

    for (let i = 1; i < 5; i++) {
      expect(updatedSimpleSubscription.userIds).toContain(i.toString());
    }
  });

  it('throws an error when user already subscribed', async () => {
    const { id: guildId } = guild;
    const subscription = await Subscription.create({
      name: 'subscription1',
      guildId,
    });
    await subscriptionsDatabase.subscribeUser({
      userId: '1',
      subscriptionId: subscription.id,
    });
    const subscribeUserPromise = subscriptionsDatabase.subscribeUser({
      userId: '1',
      subscriptionId: subscription.id,
    });
    await expect(subscribeUserPromise).rejects.toThrow(UserSubscriptionError);
  });

  it("throws an error when the subscription doesn't exist", async () => {
    const nonExistentSubscriptionId = 1;
    const subscription = await Subscription.findByPk(nonExistentSubscriptionId);

    expect(subscription).toBeNull();

    const subscribeUserPromise = subscriptionsDatabase.subscribeUser({
      userId: '1',
      subscriptionId: nonExistentSubscriptionId,
    });
    await expect(subscribeUserPromise).rejects.toThrow(
      SubscriptionDoesNotExistError
    );
  });

  it('unsubscribes a subscribed user', async () => {
    const subscription = await Subscription.create({
      name: 'subscription',
      guildId: guild.id,
    });

    await SubscriptionUsers.create({
      subscriptionId: subscription.id,
      userId: '1',
    });
    await subscriptionsDatabase.unsubscribeUser({
      userId: '1',
      subscriptionId: subscription.id,
    });
    const foundSubscription = (await Subscription.findByPk(subscription.id, {
      attributes: ['id', 'name'],
      include: [{ model: User, as: 'users', attributes: ['id'] }],
    })) as SubscriptionInstanceWithUsers | null;

    expect(foundSubscription).not.toBeNull();
    if (!foundSubscription) return;
    const userIds = foundSubscription.users.map((u) => u.id);
    expect(userIds).toHaveLength(0);
  });

  it('throws when unsubscribing an unsubscribed user', async () => {
    const subscription = await Subscription.create({
      name: 'subscription',
      guildId: guild.id,
    });

    const unsubscribeUserPromise = subscriptionsDatabase.unsubscribeUser({
      userId: '1',
      subscriptionId: subscription.id,
    });
    await expect(unsubscribeUserPromise).rejects.toThrowError(
      UserNotSubscribedError
    );
    const foundSubscription = (await Subscription.findByPk(subscription.id, {
      attributes: ['id', 'name'],
      include: [{ model: User, as: 'users', attributes: ['id'] }],
    })) as SubscriptionInstanceWithUsers | null;

    expect(foundSubscription).not.toBeNull();
    if (!foundSubscription) return;
    const userIds = foundSubscription.users.map((u) => u.id);
    expect(userIds).toHaveLength(0);
  });

  it('creates a new subscription', async () => {
    const newSubscription = await subscriptionsDatabase.createSubscription({
      guildId: guild.id,
      subscriptionName: 'My new subscription',
    });
    const foundSubscription = Subscription.findByPk(newSubscription.id);
    expect(foundSubscription).toBeTruthy();
  });

  it('creates a new subscription with no existing guild', async () => {
    const nonExistentGuildId = 'asdf';
    const nonExistentGuild = await Guild.findOne({
      where: { id: nonExistentGuildId },
    });
    expect(nonExistentGuild).toBeNull();

    const newSubscription = await subscriptionsDatabase.createSubscription({
      guildId: nonExistentGuildId,
      subscriptionName: 'My new subscription',
    });
    const foundSubscription = Subscription.findByPk(newSubscription.id);
    expect(foundSubscription).toBeTruthy();
  });

  it('deletes an existing subscription', async () => {
    const subscription = await Subscription.create({
      name: 'subscription',
      guildId: guild.id,
    });
    const deleteSubscriptionPromise = subscriptionsDatabase.deleteSubscription({
      subscriptionId: subscription.id,
    });

    await expect(deleteSubscriptionPromise).resolves.not.toThrow();
    const deletedSubscription = await deleteSubscriptionPromise;
    expect(deletedSubscription.name).toBe(subscription.name);
    expect(deletedSubscription.id).toBe(subscription.id);
  });

  it('throws when deleting nonexistent subscription', async () => {
    const nonExistentSubscriptionId = 1;
    const subscription = await Subscription.findByPk(nonExistentSubscriptionId);

    expect(subscription).toBeNull();
    const deleteSubscriptionPromise = subscriptionsDatabase.deleteSubscription({
      subscriptionId: nonExistentSubscriptionId,
    });

    await expect(deleteSubscriptionPromise).rejects.toThrowError(
      SubscriptionDoesNotExistError
    );
  });

  it('creates two subscriptions of the same name across servers successfully', async () => {
    const name = 'asdf';
    await subscriptionsDatabase.createSubscription({
      guildId: '1234',
      subscriptionName: name,
    });
    await subscriptionsDatabase.createSubscription({
      guildId: '1235',
      subscriptionName: name,
    });
  });
});
