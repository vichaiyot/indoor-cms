import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateAuthDto } from 'src/dto/auth/create-auth.dto';
import { UpdateAuthDto } from 'src/dto/auth/update-auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post()
  @ApiOperation({ summary: 'Create new auth record' })
  @ApiResponse({ status: 201, description: 'Auth record successfully created' })
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all auth records' })
  @ApiResponse({ status: 200, description: 'Return all auth records' })
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get auth record by id' })
  @ApiParam({ name: 'id', description: 'Auth ID', type: String })
  @ApiResponse({ status: 200, description: 'Return auth record' })
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update auth record by id' })
  @ApiParam({ name: 'id', description: 'Auth ID', type: String })
  @ApiResponse({ status: 200, description: 'Auth record updated' })
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete auth record by id' })
  @ApiParam({ name: 'id', description: 'Auth ID', type: String })
  @ApiResponse({ status: 200, description: 'Auth record removed' })
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
