import { DataTypes, Model } from 'sequelize/dist';
import db from '..';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { WithOptionalId } from '../../types';

export interface SubscriptionUserAttributes {
  id: number;
  subscriptionId: number;
  userId: string;
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
      type: `${DataTypes.STRING(255)} CHARSET ascii COLLATE ascii_bin`,
      references: {
        model: User,
        key: 'id',
      },
    },
  }
);

export default SubscriptionUsers;
