import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-org.dto';
import { UpdateOrganizationDto } from './dto/update-org.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    // Atomically create organization and assign the creator as 'admin'
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          type: dto.type,
        },
      });

      const membership = await tx.orgMembership.create({
        data: {
          userId,
          orgId: organization.id,
          role: OrgRole.admin,
        },
      });

      return {
        ...organization,
        membership: {
          id: membership.id,
          role: membership.role,
        },
      };
    });
  }

  async update(orgId: string, dto: UpdateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!existing) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        address: dto.address,
        contactNumber: dto.contactNumber,
        city: dto.city,
        description: dto.description,
      },
    });
  }

  async getPublicProfile(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        contactNumber: true,
        city: true,
        description: true,
        createdAt: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async findById(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }
}
