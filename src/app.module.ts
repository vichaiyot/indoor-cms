import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { EventController } from './event/event.controller';
import { EventService } from './event/event.service';

@Module({
  controllers: [AuthController, EventController],
  providers: [AuthService, EventService],
})
export class AppModule { }
