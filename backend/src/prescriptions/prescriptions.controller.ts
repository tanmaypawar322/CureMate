import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') doctorUserId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(doctorUserId, dto);
  }

  @Get('mine')
  async getMyPrescriptions(@CurrentUser('id') patientUserId: string) {
    return this.prescriptionsService.getMyPrescriptions(patientUserId);
  }

  @Get(':id')
  async getById(
    @Param('id') prescriptionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.prescriptionsService.getById(prescriptionId, userId);
  }
}
