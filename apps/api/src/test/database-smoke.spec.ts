import { Test } from '@nestjs/testing';
import { TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database.module';
import { DatabaseSmokeService } from '../database-smoke.service';

describe('Database smoke', () => {
  let service: DatabaseSmokeService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    process.env.MONGODB_URI =
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bdemanager_test';

    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [DatabaseSmokeService],
    }).compile();

    service = moduleRef.get(DatabaseSmokeService);
  }, 20000);

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('connects and returns an array of collection names', async () => {
    const names = await service.listCollections();
    expect(Array.isArray(names)).toBe(true);
  });
});
