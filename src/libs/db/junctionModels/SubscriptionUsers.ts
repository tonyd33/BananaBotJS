import { DataTypes, Model } from 'sequelize/dist';
import db from '../db';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { WithOptionalId } from '../../types';

export interface SubscriptionUserAttributes {
  id: number;
  subscriptionId: number;
  userId: number;
}

export interface SubscriptionUserInstance
  extends Model<
      SubscriptionUserAttributes,
      WithOptionalId<SubscriptionUserAttributes>
    >,
    SubscriptionUserAttributes {}

const SubscriptionUsers = db.define<SubscriptionUserInstance>(
  'SubscriptionUsers',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      references: {
        model: Subscription,
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'id',
      },
    },
  }
);

export default SubscriptionUsers;
