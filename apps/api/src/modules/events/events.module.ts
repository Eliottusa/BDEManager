import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { PaymentsModule } from "../payments/payments.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [PrismaModule, PaymentsModule, MailModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
