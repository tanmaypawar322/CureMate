import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard, Public } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDoctorProfileDto,
  ) {
    return this.doctorsService.createProfile(userId, dto);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorsService.updateProfile(userId, dto);
  }

  @Post('availability')
  @HttpCode(HttpStatus.OK)
  async setAvailability(
    @CurrentUser('id') userId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.doctorsService.setAvailability(userId, dto);
  }

  @Public()
  @Get(':id/public')
  async getPublicProfile(@Param('id') doctorIdentifier: string) {
    return this.doctorsService.getPublicProfile(doctorIdentifier);
  }

  @Public()
  @Get(':id/availability')
  async getAvailability(@Param('id') doctorIdentifier: string) {
    return this.doctorsService.getAvailability(doctorIdentifier);
  }

  @Public()
  @Get(':id/available-slots')
  async getAvailableSlots(
    @Param('id') doctorIdentifier: string,
    @Query('date') date: string,
  ) {
    return this.doctorsService.getAvailableSlots(doctorIdentifier, date);
  }
}
