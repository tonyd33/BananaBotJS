import { DataTypes, Model } from 'sequelize/dist';
import db from '../db';

export interface SubscriptionsMentionMessageAttributes {
  messageId: string;
  subscriptionId: number;
}

export interface SubscriptionsMentionMessageInstance
  extends Model<
      SubscriptionsMentionMessageAttributes,
      SubscriptionsMentionMessageAttributes
    >,
    SubscriptionsMentionMessageAttributes {}

const SubscriptionsMentionMessage =
  db.define<SubscriptionsMentionMessageInstance>(
    'SubscriptionsMentionMessage',
    {
      messageId: {
        type: `${DataTypes.STRING(255)} CHARSET ascii COLLATE ascii_bin`,
        primaryKey: true,
      },
      subscriptionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    }
  );

export default SubscriptionsMentionMessage;
