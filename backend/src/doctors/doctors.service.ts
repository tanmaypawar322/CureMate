import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateDoctorProfileDto) {
    // 1. Verify user actually has 'doctor' role in this organization
    const membership = await this.prisma.orgMembership.findFirst({
      where: {
        userId,
        orgId: dto.orgId,
        role: OrgRole.doctor,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You must hold the doctor role in this organization to create a doctor profile',
      );
    }

    // 2. Check if profile already exists for this org
    const existing = await this.prisma.doctorProfile.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: dto.orgId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Doctor profile already exists for this organization',
      );
    }

    return this.prisma.doctorProfile.create({
      data: {
        userId,
        orgId: dto.orgId,
        specialization: dto.specialization,
        licenseNo: dto.licenseNo,
        consultationFee: dto.consultationFee,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
      },
      include: {
        organization: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateDoctorProfileDto) {
    const profile = await this.prisma.doctorProfile.findFirst({
      where: {
        userId,
        ...(dto.orgId ? { orgId: dto.orgId } : {}),
      },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.prisma.doctorProfile.update({
      where: { id: profile.id },
      data: {
        specialization: dto.specialization,
        licenseNo: dto.licenseNo,
        consultationFee: dto.consultationFee,
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
      },
      include: {
        organization: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async getPublicProfile(doctorIdentifier: string) {
    // Lookup by doctor profile ID or user ID
    const profile = await this.prisma.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorIdentifier }, { userId: doctorIdentifier }],
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            address: true,
            contactNumber: true,
            description: true,
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
    });

    if (!profile) {
      throw new NotFoundException('Doctor not found');
    }

    return profile;
  }

  async setAvailability(userId: string, dto: SetAvailabilityDto) {
    // 1. Verify user holds doctor role in the org
    const membership = await this.prisma.orgMembership.findFirst({
      where: {
        userId,
        orgId: dto.orgId,
        role: OrgRole.doctor,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You must hold the doctor role in this organization to configure availability',
      );
    }

    // 2. Find doctor profile
    const profile = await this.prisma.doctorProfile.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: dto.orgId,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Doctor profile must be created before setting availability',
      );
    }

    // 3. Atomically replace availability slots
    return this.prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({
        where: {
          doctorId: profile.id,
          orgId: dto.orgId,
        },
      });

      const createdSlots = await Promise.all(
        dto.slots.map((slot) =>
          tx.doctorAvailability.create({
            data: {
              doctorId: profile.id,
              orgId: dto.orgId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotDurationMinutes: slot.slotDurationMinutes || 30,
            },
          }),
        ),
      );

      return createdSlots;
    });
  }

  async getAvailability(doctorIdentifier: string) {
    const profile = await this.prisma.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorIdentifier }, { userId: doctorIdentifier }],
      },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.prisma.doctorAvailability.findMany({
      where: { doctorId: profile.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getAvailableSlots(doctorIdentifier: string, dateStr: string) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Query param date must be in YYYY-MM-DD format');
    }

    const profile = await this.prisma.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorIdentifier }, { userId: doctorIdentifier }],
      },
      include: { organization: true },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Determine target day of week (0 = Sunday ... 6 = Saturday)
    // Parse target date in UTC/local date context
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = targetDate.getUTCDay();

    // Fetch availability for that day of week
    const availabilities = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId: profile.id,
        dayOfWeek,
      },
    });

    if (availabilities.length === 0) {
      return {
        date: dateStr,
        dayOfWeek,
        slots: [],
      };
    }

    // Generate potential slots for the day
    const generatedSlots: { time: string; datetime: string }[] = [];

    for (const avail of availabilities) {
      const [startH, startM] = avail.startTime.split(':').map(Number);
      const [endH, endM] = avail.endTime.split(':').map(Number);
      const slotDuration = avail.slotDurationMinutes || 30;

      let currentMinute = startH * 60 + startM;
      const endMinute = endH * 60 + endM;

      while (currentMinute + slotDuration <= endMinute) {
        const slotH = Math.floor(currentMinute / 60);
        const slotM = currentMinute % 60;
        const timeStr = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;

        const slotDate = new Date(Date.UTC(year, month - 1, day, slotH, slotM, 0, 0));
        generatedSlots.push({
          time: timeStr,
          datetime: slotDate.toISOString(),
        });

        currentMinute += slotDuration;
      }
    }

    // Fetch booked active appointments for this doctor on that date
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: profile.userId,
        orgId: profile.orgId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'cancelled',
        },
      },
      select: {
        scheduledAt: true,
      },
    });

    const bookedTimestamps = new Set(
      bookedAppointments.map((a) => a.scheduledAt.toISOString()),
    );

    // Exclude booked slots
    const availableSlots = generatedSlots.filter(
      (slot) => !bookedTimestamps.has(slot.datetime),
    );

    return {
      date: dateStr,
      dayOfWeek,
      doctorId: profile.id,
      doctorUserId: profile.userId,
      orgId: profile.orgId,
      slots: availableSlots,
    };
  }
}
