import { Injectable } from '@nestjs/common';
import { CreateEventDto } from 'src/dto/event/create-event.dto';
import { UpdateEventDto } from 'src/dto/event/update-event.dto';

@Injectable()
export class EventService {
  create(createEventDto: CreateEventDto) {
    return 'This action adds a new event';
  }

  findAll() {
    return `This action returns all event`;
  }

  findOne(id: string) {
    return `This action returns a #${id} event`;
  }

  update(id: string, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: string) {
    return `This action removes a #${id} event`;
  }
}
