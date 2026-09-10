import { Injectable } from '@nestjs/common';
import { CreateEventDto } from '../dto/event/create-event.dto';
import { UpdateEventDto } from '../dto/event/update-event.dto';

@Injectable()
export class EventService {
  create(createEventDto: CreateEventDto) {
    return 'This action adds a new event';
  }

  findAll() {
    return `This action returns all event`;
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  update(id: number, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }
}
