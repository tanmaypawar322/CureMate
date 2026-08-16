import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs queries within a transaction scoped strictly to the given tenant ID.
   * Uses PostgreSQL's transaction-local configuration: set_config('app.current_tenant_id', $orgId, true)
   * This is safe under connection pooling because the setting resets automatically on commit/rollback.
   */
  async withTenant<T>(
    orgId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    userId?: string,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${orgId}, true);`;
      if (userId) {
        await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true);`;
      }
      return callback(tx);
    });
  }
}
