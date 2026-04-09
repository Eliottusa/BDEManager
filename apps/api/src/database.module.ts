import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import mongoose from 'mongoose';
import { databaseProviders } from './database.providers';

@Global()
@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule implements OnModuleDestroy {
  async onModuleDestroy() {
    try {
      await mongoose.disconnect();
    } catch (err) {
      // ignore
    }
  }
}
