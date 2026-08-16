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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-org.dto';
import { UpdateOrganizationDto } from './dto/update-org.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard, Public } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(userId, dto);
  }

  @Patch(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrgRole.admin)
  async update(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(orgId, dto);
  }

  @Public()
  @Get(':orgId/public')
  async getPublicProfile(@Param('orgId') orgId: string) {
    return this.organizationsService.getPublicProfile(orgId);
  }

  @Get(':orgId')
  @UseGuards(RolesGuard)
  @Roles(OrgRole.admin, OrgRole.doctor, OrgRole.pharmacy_owner, OrgRole.lab_owner, OrgRole.staff)
  async findById(@Param('orgId') orgId: string) {
    return this.organizationsService.findById(orgId);
  }
}
