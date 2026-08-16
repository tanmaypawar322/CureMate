import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePrescriptionItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Medicine name is required' })
  medicineName: string;

  @IsString()
  @IsNotEmpty({ message: 'Dosage is required (e.g. 500mg, 1 tablet)' })
  dosage: string;

  @IsString()
  @IsNotEmpty({ message: 'Frequency is required (e.g. Twice daily)' })
  frequency: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Duration must be at least 1 day' })
  durationDays: number;
}

export class CreatePrescriptionDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Appointment ID is required' })
  appointmentId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items: CreatePrescriptionItemDto[];
}
