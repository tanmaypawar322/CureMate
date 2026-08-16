import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class BookAppointmentDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Organization ID is required' })
  orgId: string;

  @IsUUID()
  @IsNotEmpty({ message: 'Doctor ID is required' })
  doctorId: string; // Doctor User ID or Profile ID (we will resolve)

  @IsDateString({}, { message: 'scheduledAt must be a valid ISO Date string' })
  @IsNotEmpty({ message: 'scheduledAt is required' })
  scheduledAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
