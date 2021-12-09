import { DataTypes, Model } from 'sequelize/dist';
import db from '../db';

export interface UserAttributes {
  id: number;
}

export interface UserInstance
  extends Model<UserAttributes, UserAttributes>,
    UserAttributes {}

const User = db.define<UserInstance>('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
});

export default User;
