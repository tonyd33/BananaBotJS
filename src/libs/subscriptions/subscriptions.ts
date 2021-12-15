export interface ClientSubscription {
  id: number;
  name: string;
  userIds: string[];
}

/**
 * Returns a list of subscriptions matching the query.
 */
export function querySubscriptions(
  query: string,
  subscriptions: ClientSubscription[],
  options: {} = {}
): ClientSubscription[] {
  if (query.length === 0) return subscriptions;
  const regex = new RegExp(query, 'i');
  return subscriptions.filter((subscription) => {
    const reverseRegex = new RegExp(subscription.name, 'i');
    return (
      subscription.name.match(regex) !== null ||
      query.match(reverseRegex) !== null
    );
  });
}
