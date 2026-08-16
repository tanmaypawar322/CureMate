import { IsEnum, IsNotEmpty } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus, {
    message: 'Status must be one of: pending, confirmed, completed, cancelled',
  })
  @IsNotEmpty()
  status: AppointmentStatus;
}
