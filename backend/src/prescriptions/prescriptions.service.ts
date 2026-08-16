import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(doctorUserId: string, dto: CreatePrescriptionDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Prescription must contain at least one medicine item');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId !== doctorUserId) {
      throw new ForbiddenException('Only the consulting doctor can write prescriptions for this appointment');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Cannot issue prescriptions for cancelled appointments');
    }

    const existing = await this.prisma.prescription.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existing) {
      throw new ConflictException('A prescription has already been created for this appointment');
    }

    return this.prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          appointmentId: dto.appointmentId,
          doctorId: doctorUserId,
          patientId: appointment.patientId,
          orgId: appointment.orgId,
          notes: dto.notes,
        },
      });

      const items = await Promise.all(
        dto.items.map((item) =>
          tx.prescriptionItem.create({
            data: {
              prescriptionId: prescription.id,
              orgId: appointment.orgId,
              medicineName: item.medicineName,
              dosage: item.dosage,
              frequency: item.frequency,
              durationDays: item.durationDays,
            },
          }),
        ),
      );

      // Automatically mark appointment as completed upon prescription issuance
      await tx.appointment.update({
        where: { id: dto.appointmentId },
        data: { status: 'completed' },
      });

      return {
        ...prescription,
        items,
      };
    });
  }

  async getMyPrescriptions(patientUserId: string) {
    return this.prisma.prescription.findMany({
      where: { patientId: patientUserId },
      include: {
        items: true,
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
        doctor: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(prescriptionId: string, userId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        items: true,
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
        doctor: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        patient: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    const isPatient = prescription.patientId === userId;
    const isDoctor = prescription.doctorId === userId;

    if (!isPatient && !isDoctor) {
      const isOrgAdmin = await this.prisma.orgMembership.findFirst({
        where: {
          userId,
          orgId: prescription.orgId,
          role: OrgRole.admin,
        },
      });

      if (!isOrgAdmin) {
        throw new ForbiddenException('You do not have permission to view this prescription');
      }
    }

    return prescription;
  }
}
