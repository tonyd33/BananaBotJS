import SubscriptionUsers from './junctionModels/SubscriptionUsers';
import Guild from './models/Guild';
import Subscription from './models/Subscription';
import User from './models/User';
import SubscriptionsMentionMessage from './models/SubscriptionsMentionMessage';

Guild.hasMany(Subscription, { foreignKey: 'guildId' });
Subscription.belongsTo(Guild, {
  foreignKey: 'guildId',
  targetKey: 'id',
});

Subscription.belongsToMany(User, {
  through: { model: SubscriptionUsers },
  as: 'users',
  foreignKey: 'subscriptionId',
});
User.belongsToMany(Subscription, {
  through: { model: SubscriptionUsers },
  as: 'subscriptions',
  foreignKey: 'userId',
});

Subscription.hasMany(SubscriptionsMentionMessage, {
  foreignKey: 'subscriptionId',
});
SubscriptionsMentionMessage.belongsTo(Subscription, {
  foreignKey: 'subscriptionId',
  targetKey: 'id',
});
