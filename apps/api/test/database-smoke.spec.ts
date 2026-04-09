import { Test } from '@nestjs/testing';
import { DatabaseModule } from '../src/database.module';
import { DatabaseSmokeService } from '../src/database-smoke.service';

describe('Database smoke', () => {
  let service: DatabaseSmokeService;

  beforeAll(async () => {
    process.env.MONGODB_URI =
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bdemanager_test';

    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [DatabaseSmokeService],
    }).compile();

    service = moduleRef.get(DatabaseSmokeService);
  }, 20000);

  it('connects and returns an array of collection names', async () => {
    const names = await service.listCollections();
    expect(Array.isArray(names)).toBe(true);
  });
});

