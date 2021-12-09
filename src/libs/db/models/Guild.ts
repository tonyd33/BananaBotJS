import { Model, DataTypes } from 'sequelize/dist';
import db from '../db';

export interface GuildAttributes {
  id: string;
}

export interface GuildInstance
  extends Model<GuildAttributes, GuildAttributes>,
    GuildAttributes {}

const Guild = db.define<GuildInstance>('Guild', {
  id: {
    type: DataTypes.STRING(64),
    primaryKey: true,
  },
});

export default Guild;
