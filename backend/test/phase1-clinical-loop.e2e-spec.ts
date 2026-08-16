import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 1 Core Clinical Loop (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // Test state variables
  const timestamp = Date.now();
  let adminToken = '';
  let adminUserId = '';
  let doctorToken = '';
  let doctorUserId = '';
  let patientToken = '';
  let patientUserId = '';
  let otherPatientToken = '';
  let otherPatientUserId = '';

  let orgId = '';
  let unassociatedOrgId = '';
  let doctorProfileId = '';
  let bookedSlotDatetime = '';
  let appointmentId = '';
  let prescriptionId = '';

  it('1. Setup Accounts: Create Admin, Doctor, and Patients', async () => {
    // 1. Admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: `admin_${timestamp}@hospital.com`,
        password: 'Password123!',
      })
      .expect(201);
    adminToken = adminRes.body.accessToken;
    adminUserId = adminRes.body.user.id;

    // 2. Doctor
    const doctorRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: `doctor_${timestamp}@hospital.com`,
        password: 'Password123!',
      })
      .expect(201);
    doctorToken = doctorRes.body.accessToken;
    doctorUserId = doctorRes.body.user.id;

    // 3. Patient 1
    const patientRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: `patient_${timestamp}@curemate.in`,
        password: 'Password123!',
      })
      .expect(201);
    patientToken = patientRes.body.accessToken;
    patientUserId = patientRes.body.user.id;

    // 4. Patient 2 (for conflict & unauthorized checks)
    const otherRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: `other_patient_${timestamp}@curemate.in`,
        password: 'Password123!',
      })
      .expect(201);
    otherPatientToken = otherRes.body.accessToken;
    otherPatientUserId = otherRes.body.user.id;
  });

  it('2. Organization Onboarding: Create & Update Org Profile + Public Lookup', async () => {
    // Admin creates organization
    const createOrgRes = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Fortis MultiSpecialty Hospital',
        type: 'hospital',
      })
      .expect(201);
    orgId = createOrgRes.body.id;

    // Create a dummy unassociated org
    const otherOrgRes = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .send({
        name: 'Unassociated Clinic',
        type: 'clinic',
      })
      .expect(201);
    unassociatedOrgId = otherOrgRes.body.id;

    // Admin updates org details via PATCH /organizations/:id
    const updateRes = await request(app.getHttpServer())
      .patch(`/organizations/${orgId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-org-id', orgId)
      .send({
        address: 'Bannerghatta Main Road, Sector 4',
        contactNumber: '+91 80 1234 5678',
        city: 'Bengaluru',
        description: 'Comprehensive tertiary care hospital with advanced cardiac care.',
      })
      .expect(200);

    expect(updateRes.body.city).toBe('Bengaluru');
    expect(updateRes.body.address).toContain('Bannerghatta');

    // Public view unauthenticated
    const publicRes = await request(app.getHttpServer())
      .get(`/organizations/${orgId}/public`)
      .expect(200);

    expect(publicRes.body.id).toBe(orgId);
    expect(publicRes.body.city).toBe('Bengaluru');
    expect(publicRes.body.name).toBe('Fortis MultiSpecialty Hospital');
  });

  it('3. Doctor Role Assignment & Profile Creation', async () => {
    // Add doctor to org_memberships
    await prisma.orgMembership.create({
      data: {
        userId: doctorUserId,
        orgId,
        role: 'doctor',
      },
    });

    // Doctor creates profile in org
    const profileRes = await request(app.getHttpServer())
      .post('/doctors/profile')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('x-org-id', orgId)
      .send({
        orgId,
        specialization: 'Cardiologist',
        licenseNo: 'MCI-CARDIO-8899',
        consultationFee: 800,
        bio: 'Senior Consultant Interventional Cardiologist with 12+ years clinical experience.',
        yearsExperience: 12,
      })
      .expect(201);

    expect(profileRes.body.specialization).toBe('Cardiologist');
    expect(profileRes.body.licenseNo).toBe('MCI-CARDIO-8899');
    doctorProfileId = profileRes.body.id;
  });

  it('4. Doctor Availability: Security Check (403 for unassociated org) & Setup', async () => {
    // Attempt to set availability for an org where doctor does NOT belong -> Must return 403 Forbidden
    await request(app.getHttpServer())
      .post('/doctors/availability')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('x-org-id', unassociatedOrgId)
      .send({
        orgId: unassociatedOrgId,
        slots: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 },
        ],
      })
      .expect(403);

    // Legitimate availability setup for affiliated org
    // Set availability for all 7 days (0..6) from 09:00 to 17:00 with 30 min slots
    const availRes = await request(app.getHttpServer())
      .post('/doctors/availability')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('x-org-id', orgId)
      .send({
        orgId,
        slots: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
          { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
        ],
      })
      .expect(200);

    expect(availRes.body.length).toBe(7);
  });

  it('5. Live Slot Computation Engine: Compute available slots for date', async () => {
    const testDate = '2026-08-25';
    const slotsRes = await request(app.getHttpServer())
      .get(`/doctors/${doctorProfileId}/available-slots?date=${testDate}`)
      .expect(200);

    expect(slotsRes.body.slots.length).toBeGreaterThan(0);
    expect(slotsRes.body.slots[0]).toHaveProperty('time');
    expect(slotsRes.body.slots[0]).toHaveProperty('datetime');
    bookedSlotDatetime = slotsRes.body.slots[0].datetime;
  });

  it('6. Patient Global Profile: Create & Retrieve', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/patients/profile')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        dateOfBirth: '1990-05-15T00:00:00.000Z',
        gender: 'male',
        address: '7th Block, Koramangala, Bengaluru',
        emergencyContactName: 'Priya Sharma',
        emergencyContactPhone: '+91 9988776655',
      })
      .expect(201);

    expect(createRes.body.gender).toBe('male');
    expect(createRes.body.emergencyContactName).toBe('Priya Sharma');

    const getRes = await request(app.getHttpServer())
      .get('/patients/profile')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(getRes.body.address).toContain('Koramangala');
  });

  it('7. Public Search: Find Doctors by Specialization & City', async () => {
    const searchRes = await request(app.getHttpServer())
      .get('/search/doctors?specialization=Cardio&city=Bengaluru')
      .expect(200);

    expect(searchRes.body.length).toBeGreaterThan(0);
    expect(searchRes.body[0].specialization).toBe('Cardiologist');
    expect(searchRes.body[0].organization.city).toBe('Bengaluru');
  });

  it('8. Appointment Booking & Double-Booking Prevention', async () => {
    // Patient 1 books the slot
    const bookRes = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        orgId,
        doctorId: doctorUserId,
        scheduledAt: bookedSlotDatetime,
        notes: 'Experiencing elevated heart rate during exercise',
      })
      .expect(201);

    expect(bookRes.body.status).toBe('confirmed');
    expect(bookRes.body.scheduledAt).toBe(bookedSlotDatetime);
    appointmentId = bookRes.body.id;

    // Patient 2 attempts to double-book the EXACT same slot -> Must return 409 Conflict
    const doubleBookRes = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .send({
        orgId,
        doctorId: doctorUserId,
        scheduledAt: bookedSlotDatetime,
        notes: 'Attempting conflicting booking',
      })
      .expect(409);

    expect(doubleBookRes.body.message).toContain('already been booked');
  });

  it('9. Patient & Doctor Queues: Global vs Tenant Views', async () => {
    // Patient views appointments across all orgs (GET /appointments/mine)
    const patientApptsRes = await request(app.getHttpServer())
      .get('/appointments/mine')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(patientApptsRes.body.length).toBeGreaterThan(0);
    expect(patientApptsRes.body[0].id).toBe(appointmentId);

    // Doctor views appointments in their org queue (GET /appointments/org)
    const doctorQueueRes = await request(app.getHttpServer())
      .get('/appointments/org')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('x-org-id', orgId)
      .expect(200);

    expect(doctorQueueRes.body.some((a: any) => a.id === appointmentId)).toBe(true);

    // Doctor marks consultation completed
    const completeRes = await request(app.getHttpServer())
      .patch(`/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('x-org-id', orgId)
      .send({ status: 'completed' })
      .expect(200);

    expect(completeRes.body.status).toBe('completed');
  });

  it('10. Prescriptions: Create with structured items & Patient Retrieval', async () => {
    // Doctor creates structured prescription
    const prescRes = await request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('x-org-id', orgId)
      .send({
        appointmentId,
        notes: 'Rest for 3 days. Reduce sodium intake and monitor blood pressure morning/evening.',
        items: [
          {
            medicineName: 'Metoprolol Tartrate',
            dosage: '25mg',
            frequency: 'Once daily after breakfast',
            durationDays: 14,
          },
          {
            medicineName: 'Aspirin (Cardio)',
            dosage: '75mg',
            frequency: 'Once daily with water',
            durationDays: 30,
          },
        ],
      })
      .expect(201);

    expect(prescRes.body.items.length).toBe(2);
    expect(prescRes.body.items[0].medicineName).toBe('Metoprolol Tartrate');
    prescriptionId = prescRes.body.id;

    // Patient views their prescriptions across all orgs (GET /prescriptions/mine)
    const patientPrescRes = await request(app.getHttpServer())
      .get('/prescriptions/mine')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(patientPrescRes.body.length).toBeGreaterThan(0);
    expect(patientPrescRes.body[0].id).toBe(prescriptionId);
    expect(patientPrescRes.body[0].items.length).toBe(2);

    // Authorized lookup: Patient views prescription by ID
    const getByIdRes = await request(app.getHttpServer())
      .get(`/prescriptions/${prescriptionId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(getByIdRes.body.id).toBe(prescriptionId);

    // Security Check: Unauthorized third-party patient receives 403 Forbidden
    await request(app.getHttpServer())
      .get(`/prescriptions/${prescriptionId}`)
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .expect(403);
  });

  it('11. PostgreSQL Engine RLS Verification: All 6 Tenant Tables Have FORCE RLS Active', async () => {
    const tables = [
      'org_memberships',
      'doctor_profiles',
      'doctor_availability',
      'appointments',
      'prescriptions',
      'prescription_items',
    ];

    const rlsResults: any[] = await prisma.$queryRawUnsafe(`
      SELECT relname, relrowsecurity, relforcerowsecurity 
      FROM pg_class 
      WHERE relname IN ('${tables.join("','")}')
      ORDER BY relname;
    `);

    expect(rlsResults.length).toBe(6);
    for (const row of rlsResults) {
      expect(row.relrowsecurity).toBe(true);
      expect(row.relforcerowsecurity).toBe(true);
    }
  });
});
