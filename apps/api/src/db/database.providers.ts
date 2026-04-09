import { Provider } from '@nestjs/common';
import mongoose from 'mongoose';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProviders: Provider[] = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async (): Promise<mongoose.Connection> => {
      const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bdemanager';
      await mongoose.connect(uri);
      return mongoose.connection;
    },
  },
];
