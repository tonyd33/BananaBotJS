import { Model, DataTypes } from 'sequelize/dist';
import db from '..';

export interface GuildAttributes {
  id: string;
}

export interface GuildInstance
  extends Model<GuildAttributes, GuildAttributes>,
    GuildAttributes {}

const Guild = db.define<GuildInstance>('Guild', {
  id: {
    type: `${DataTypes.STRING(255)} CHARSET ascii COLLATE ascii_bin`,
    primaryKey: true,
  },
});

export default Guild;
