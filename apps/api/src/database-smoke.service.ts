import { Injectable, Inject } from '@nestjs/common';
import mongoose from 'mongoose';
import { DATABASE_CONNECTION } from './database.providers';

@Injectable()
export class DatabaseSmokeService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly connection: mongoose.Connection,
  ) {}

  async listCollections(): Promise<string[]> {
    const cols = await this.connection.db.listCollections().toArray();
    return cols.map((c) => c.name);
  }
}
