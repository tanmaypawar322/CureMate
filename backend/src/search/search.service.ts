import { Injectable } from '@nestjs/common';
import { OrgType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchDoctors(query: {
    specialization?: string;
    city?: string;
    search?: string;
  }) {
    const where: Prisma.DoctorProfileWhereInput = {};

    if (query.specialization) {
      where.specialization = {
        contains: query.specialization,
        mode: 'insensitive',
      };
    }

    if (query.city) {
      where.organization = {
        city: {
          contains: query.city,
          mode: 'insensitive',
        },
      };
    }

    if (query.search) {
      where.OR = [
        { specialization: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
        {
          organization: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    return this.prisma.doctorProfile.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            address: true,
            contactNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async searchOrganizations(query: {
    type?: string;
    city?: string;
    search?: string;
  }) {
    const where: Prisma.OrganizationWhereInput = {};

    if (query.type) {
      where.type = query.type as OrgType;
    }

    if (query.city) {
      where.city = {
        contains: query.city,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.organization.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });
  }
}
