import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrgType } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  name: string;

  @IsEnum(OrgType, {
    message: 'Type must be one of: hospital, clinic, pharmacy, lab',
  })
  @IsNotEmpty({ message: 'Organization type is required' })
  type: OrgType;
}
