import { Module } from '@nestjs/common';
import { AuthController } from './workflow/auth/auth.controller';
import { AuthService } from './workflow/auth/auth.service';
import { EventController } from './workflow/event/event.controller';
import { EventService } from './workflow/event/event.service';

@Module({
  controllers: [AuthController, EventController],
  providers: [AuthService, EventService],
})
export class AppModule { }
