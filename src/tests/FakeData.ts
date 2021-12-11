import { SimpleSubscription } from '../libs/subscriptions/subscriptions';
let counter = 0;

function makeSimpleSubscription(
  options: Partial<SimpleSubscription> = {}
): SimpleSubscription {
  return {
    id: options.id ?? counter++,
    userIds: options.userIds ?? [],
    name: options.name ?? `Subscription-${counter++}`,
  };
}

export default {
  makeSimpleSubscription,
};
