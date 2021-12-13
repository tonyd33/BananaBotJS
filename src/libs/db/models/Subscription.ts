import { DataTypes, Model } from 'sequelize/dist';
import { WithOptionalId } from '../../types';
import db from '../db';

export interface SubscriptionAttributes {
  id: number;
  name: string;
  guildId: string;
}

export type SubscriptionCreationAttributes =
  WithOptionalId<SubscriptionAttributes>;

export interface SubscriptionInstance
  extends Model<SubscriptionAttributes, SubscriptionCreationAttributes>,
    SubscriptionAttributes {}

const Subscription = db.define<SubscriptionInstance>('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: `${DataTypes.STRING(255)} CHARSET ascii COLLATE ascii_bin`,
    allowNull: false,
  },
  guildId: {
    type: `${DataTypes.STRING(255)} CHARSET ascii COLLATE ascii_bin`,
    allowNull: false,
  },
});

export default Subscription;
