import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async bookAppointment(
    @CurrentUser('id') patientUserId: string,
    @Body() dto: BookAppointmentDto,
  ) {
    return this.appointmentsService.bookAppointment(patientUserId, dto);
  }

  @Get('mine')
  async getMyAppointments(@CurrentUser('id') patientUserId: string) {
    return this.appointmentsService.getMyAppointments(patientUserId);
  }

  @Get('org')
  @UseGuards(RolesGuard)
  @Roles(OrgRole.admin, OrgRole.doctor, OrgRole.staff)
  async getOrgAppointments(@CurrentOrg() orgId: string) {
    return this.appointmentsService.getOrgAppointments(orgId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') appointmentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(appointmentId, userId, dto);
  }
}
