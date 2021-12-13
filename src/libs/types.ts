import { Optional } from 'sequelize';

export type AsyncOrSyncReturnT<T> = Promise<T> | T;

export type WithOptionalId<T extends { id: number }> = Optional<T, 'id'>;
