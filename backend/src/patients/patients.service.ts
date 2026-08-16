import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreatePatientProfileDto) {
    const existing = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Patient profile already exists for this user');
    }

    return this.prisma.patientProfile.create({
      data: {
        userId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            abhaId: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.prisma.patientProfile.update({
      where: { userId },
      data: {
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            abhaId: true,
          },
        },
      },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            abhaId: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }

    return profile;
  }
}
