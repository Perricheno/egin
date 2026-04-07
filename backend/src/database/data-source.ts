import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database.config';

export const AppDataSource = new DataSource(buildDatabaseOptions(process.env));

export default AppDataSource;
