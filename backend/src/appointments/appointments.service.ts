import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async bookAppointment(patientUserId: string, dto: BookAppointmentDto) {
    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduledAt datetime format');
    }

    // 1. Resolve and validate Doctor Profile & Organization Link
    const doctorProfile = await this.prisma.doctorProfile.findFirst({
      where: {
        OR: [{ id: dto.doctorId }, { userId: dto.doctorId }],
        orgId: dto.orgId,
      },
      include: {
        organization: true,
      },
    });

    if (!doctorProfile) {
      throw new BadRequestException('Doctor is not associated with this organization');
    }

    // 2. Validate Doctor's active role membership in the organization
    const doctorMembership = await this.prisma.orgMembership.findFirst({
      where: {
        userId: doctorProfile.userId,
        orgId: dto.orgId,
        role: OrgRole.doctor,
      },
    });

    if (!doctorMembership) {
      throw new BadRequestException('Doctor is not active in this organization');
    }

    // 3. Validate Doctor's configured weekly availability
    const dayOfWeek = scheduledDate.getUTCDay();
    const reqHours = scheduledDate.getUTCHours();
    const reqMinutes = scheduledDate.getUTCMinutes();
    const reqTotalMinutes = reqHours * 60 + reqMinutes;

    const availabilities = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId: doctorProfile.id,
        orgId: dto.orgId,
        dayOfWeek,
      },
    });

    if (availabilities.length === 0) {
      throw new BadRequestException('Doctor has no available schedule on this day of week');
    }

    const isWithinSlot = availabilities.some((avail) => {
      const [startH, startM] = avail.startTime.split(':').map(Number);
      const [endH, endM] = avail.endTime.split(':').map(Number);
      const slotDuration = avail.slotDurationMinutes || 30;

      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (reqTotalMinutes < startTotal || reqTotalMinutes + slotDuration > endTotal) {
        return false;
      }

      return (reqTotalMinutes - startTotal) % slotDuration === 0;
    });

    if (!isWithinSlot) {
      throw new BadRequestException('Requested appointment time does not match doctor availability slots');
    }

    // 4. Pre-check existing active appointments
    const existingConflict = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctorProfile.userId,
        scheduledAt: scheduledDate,
        status: {
          not: 'cancelled',
        },
      },
    });

    if (existingConflict) {
      throw new ConflictException('This slot has already been booked');
    }

    // 5. Atomic Insertion with Database Partial Unique Index Protection
    try {
      return await this.prisma.appointment.create({
        data: {
          orgId: dto.orgId,
          patientId: patientUserId,
          doctorId: doctorProfile.userId,
          scheduledAt: scheduledDate,
          status: 'confirmed',
          notes: dto.notes,
        },
        include: {
          organization: {
            select: { id: true, name: true, type: true, city: true, address: true },
          },
          doctorUser: {
            select: { id: true, email: true, phone: true },
          },
          doctor: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This slot has already been booked');
      }
      throw error;
    }
  }

  async getMyAppointments(patientUserId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId: patientUserId },
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
        doctorUser: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        doctor: true,
        prescription: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getOrgAppointments(orgId: string) {
    return this.prisma.appointment.findMany({
      where: { orgId },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            phone: true,
            patientProfile: true,
          },
        },
        doctorUser: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        doctor: true,
        prescription: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateStatus(
    appointmentId: string,
    userId: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify caller is the doctor of this appointment OR an admin of that organization
    const isAssignedDoctor = appointment.doctorId === userId;
    const isOrgAdmin = await this.prisma.orgMembership.findFirst({
      where: {
        userId,
        orgId: appointment.orgId,
        role: OrgRole.admin,
      },
    });

    if (!isAssignedDoctor && !isOrgAdmin) {
      throw new ForbiddenException(
        'You do not have permission to update the status of this appointment',
      );
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: dto.status },
      include: {
        organization: true,
        patient: {
          select: { id: true, email: true, phone: true },
        },
        doctorUser: {
          select: { id: true, email: true, phone: true },
        },
      },
    });
  }
}
