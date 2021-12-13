export class GuildDoesNotExistError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'GuildDoesNotExistError';
  }
}

export class SubscriptionExistenceError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'SubscriptionExistenceError';
  }
}

export class SubscriptionExistsError extends SubscriptionExistenceError {
  constructor(message?: string) {
    super(message);
    this.name = 'SubscriptionExistsError';
  }
}

export class SubscriptionDoesNotExistError extends SubscriptionExistenceError {
  constructor(message?: string) {
    super(message);
    this.name = 'SubscriptionDoesNotExistError';
  }
}

export class UserSubscriptionError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'UserSubscriptionError';
  }
}

export class UserAlreadySubscribedError extends UserSubscriptionError {
  constructor(message?: string) {
    super(message);
    this.name = 'UserAlreadySubscribedError';
  }
}

export class UserNotSubscribedError extends UserSubscriptionError {
  constructor(message?: string) {
    super(message);
    this.name = 'UserNotSubscribedError';
  }
}
