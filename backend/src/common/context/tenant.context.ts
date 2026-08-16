import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  orgId?: string;
  userId?: string;
}

export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantContextData>();

  static run<R>(data: TenantContextData, callback: () => R): R {
    return this.storage.run(data, callback);
  }

  static getOrgId(): string | undefined {
    return this.storage.getStore()?.orgId;
  }

  static getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  static getStore(): TenantContextData | undefined {
    return this.storage.getStore();
  }
}
