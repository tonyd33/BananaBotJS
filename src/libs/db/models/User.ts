import { DataTypes, Model } from 'sequelize/dist';
import db from '..';

export interface UserAttributes {
  id: string;
}

export interface UserInstance
  extends Model<UserAttributes, UserAttributes>,
    UserAttributes {}

const User = db.define<UserInstance>('User', {
  id: {
    type: `${DataTypes.STRING(255)} CHARSET ascii COLLATE ascii_bin`,
    primaryKey: true,
    allowNull: false,
  },
});

export default User;
