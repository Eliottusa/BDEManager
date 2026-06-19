import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { EventsModule } from "./modules/events/events.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { MailModule } from "./modules/mail/mail.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { GeoModule } from "./modules/geo/geo.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // 100 req/min par IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    PaymentsModule,
    MailModule,
    NotificationsModule,
    GeoModule,
  ],
  // Active le throttler sur les routes
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
