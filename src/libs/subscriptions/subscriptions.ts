export interface SimpleSubscription {
  id: number;
  name: string;
  userIds: number[];
}

/**
 * Returns a list of subscriptions matching the query.
 *
 * TODO: Implement and add tests
 */
export function querySubscriptions(
  query: string,
  subscriptions: SimpleSubscription[],
  options: {} = {}
): SimpleSubscription[] {
  const regex = new RegExp(query, 'i');
  return subscriptions.filter((subscription) => {
    subscription.name.match(regex);
  });
}
