
import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../database';

class FailedWebhook extends Model {
  public id!: number;
  public payload!: object;
  public headers!: object;
  public target_url!: string;
  public error_message!: string;
  public status!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FailedWebhook.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  headers: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  target_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  error_message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'failed',
  },
}, {
  sequelize,
  tableName: 'failed_webhooks',
});

export default FailedWebhook;
