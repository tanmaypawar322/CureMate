import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 0 Auth & Multi-Tenancy Flow (e2e)', () => {
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

  const testEmail = `doctor_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let accessToken = '';
  let refreshToken = '';
  let createdOrgId = '';

  it('1. POST /auth/signup - should register a new user and return tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: testEmail,
        password: testPassword,
        phone: '+919876543210',
        abhaId: '12-3456-7890-1234',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testEmail.toLowerCase());
    expect(response.body.user).not.toHaveProperty('passwordHash');

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('2. POST /auth/login - should authenticate and return tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    accessToken = response.body.accessToken;
  });

  it('3. POST /auth/refresh - should rotate tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    accessToken = response.body.accessToken;
  });

  it('4. GET /me - should return logged-in user with empty memberships initially', async () => {
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.email).toBe(testEmail.toLowerCase());
    expect(response.body.memberships).toBeDefined();
    expect(response.body.memberships.length).toBe(0);
  });

  it('5. POST /organizations - should create org and automatically make user admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Apollo Health Clinic',
        type: 'clinic',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Apollo Health Clinic');
    expect(response.body.type).toBe('clinic');
    expect(response.body.membership.role).toBe('admin');
    createdOrgId = response.body.id;
  });

  it('6. GET /me - should return user with organization membership and role admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.memberships.length).toBe(1);
    expect(response.body.memberships[0].orgId).toBe(createdOrgId);
    expect(response.body.memberships[0].role).toBe('admin');
    expect(response.body.memberships[0].organization.name).toBe('Apollo Health Clinic');
    expect(response.body.memberships[0].organization.type).toBe('clinic');
  });

  it('7. TenantInterceptor check - should block spoofed x-org-id for non-member org', async () => {
    const unassociatedOrgId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app.getHttpServer())
      .get(`/organizations/${unassociatedOrgId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-org-id', unassociatedOrgId)
      .expect(403);

    expect(response.body.message).toContain('not a member');
  });

  it('8. GET /organizations/:id - should allow member with valid x-org-id to view org details', async () => {
    const response = await request(app.getHttpServer())
      .get(`/organizations/${createdOrgId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-org-id', createdOrgId)
      .expect(200);

    expect(response.body.id).toBe(createdOrgId);
    expect(response.body.name).toBe('Apollo Health Clinic');
  });

  it('9. PostgreSQL Engine RLS Verification - withTenant strictly isolates rows at DB level', async () => {
    // Create second organization and membership directly to test engine RLS
    const secondOrg = await prisma.organization.create({
      data: { name: 'Max Care Hospital', type: 'hospital' },
    });

    const secondUser = await prisma.user.create({
      data: {
        email: `other_${Date.now()}@example.com`,
        passwordHash: 'dummyhash',
      },
    });

    await prisma.orgMembership.create({
      data: {
        orgId: secondOrg.id,
        userId: secondUser.id,
        role: 'doctor',
      },
    });

    // Query memberships scoped to createdOrgId via withTenant
    const tenant1Memberships = await prisma.withTenant(createdOrgId, async (tx) => {
      return tx.orgMembership.findMany();
    });

    expect(tenant1Memberships.every((m) => m.orgId === createdOrgId)).toBe(true);
    expect(tenant1Memberships.some((m) => m.orgId === secondOrg.id)).toBe(false);

    // Query memberships scoped to secondOrg.id via withTenant
    const tenant2Memberships = await prisma.withTenant(secondOrg.id, async (tx) => {
      return tx.orgMembership.findMany();
    });

    expect(tenant2Memberships.every((m) => m.orgId === secondOrg.id)).toBe(true);
    expect(tenant2Memberships.some((m) => m.orgId === createdOrgId)).toBe(false);
  });

  it('10. Security check - should deny unauthenticated access to /me', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .expect(401);
  });
});
