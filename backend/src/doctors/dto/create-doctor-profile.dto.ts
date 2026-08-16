import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorProfileDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Organization ID is required' })
  orgId: string;

  @IsString()
  @IsNotEmpty({ message: 'Specialization is required' })
  specialization: string;

  @IsString()
  @IsNotEmpty({ message: 'License number is required' })
  licenseNo: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Consultation fee must be non-negative' })
  consultationFee: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearsExperience?: number;
}
