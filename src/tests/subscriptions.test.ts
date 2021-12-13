import {
  querySubscriptions,
  SimpleSubscription,
} from '../libs/subscriptions/subscriptions';
import FakeData from './FakeData';

describe(querySubscriptions, () => {
  it('autocompletes basic search', () => {
    const query = 'peanut';

    const subscription1: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'peanut butter',
    });

    const subscription2: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'jelly jam',
    });
    const queried = querySubscriptions(query, [subscription1, subscription2]);

    expect(queried).toHaveLength(1);
    expect(queried[0]).toEqual(subscription1);
  });

  it('autocompletes case insensitive', () => {
    const query = 'PeaNUT';

    const subscription1: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'peanut butter',
    });

    const subscription2: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'jelly jam',
    });
    const queried = querySubscriptions(query, [subscription1, subscription2]);

    expect(queried).toHaveLength(1);
    expect(queried[0]).toEqual(subscription1);
  });

  it('autocompletes case insensitive', () => {
    const query = 'PeaNUT';

    const subscription1: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'peanut butter',
    });

    const subscription2: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'jelly jam',
    });
    const queried = querySubscriptions(query, [subscription1, subscription2]);

    expect(queried).toHaveLength(1);
    expect(queried[0]).toEqual(subscription1);
  });

  it('reverse matches', () => {
    const query = 'peanut butter';

    const subscription1: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'peaNUT',
    });

    const subscription2: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'jelly jam',
    });
    const queried = querySubscriptions(query, [subscription1, subscription2]);

    expect(queried).toHaveLength(1);
    expect(queried[0]).toEqual(subscription1);
  });

  it('shows everything on empty query', () => {
    const query = '';

    const subscription1: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'peanut butter',
    });

    const subscription2: SimpleSubscription = FakeData.makeSimpleSubscription({
      name: 'jelly jam',
    });
    const queried = querySubscriptions(query, [subscription1, subscription2]);

    expect(queried).toHaveLength(2);
  });
});
