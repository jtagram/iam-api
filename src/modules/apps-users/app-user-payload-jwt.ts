import { AppsPayload } from '../../common/jwt/apps-payload';

export class AppUserPayloadJwt {
  sub!: number;
  clienteId!: string;
  apps!: AppsPayload;

  static builder(): AppUserPayloadJwtBuilder {
    return new AppUserPayloadJwtBuilder();
  }
}

export class AppUserPayloadJwtBuilder {
  private sub?: number;
  private clienteId?: string;
  private apps?: AppsPayload;

  withSub(sub: number): this {
    this.sub = sub;
    return this;
  }

  withClienteId(clienteId: string): this {
    this.clienteId = clienteId;
    return this;
  }

  withApps(apps: AppsPayload): this {
    this.apps = apps;
    return this;
  }

  build(): AppUserPayloadJwt {
    if (this.sub === undefined) {
      throw new Error('AppUserPayloadJwt.Builder: sub is required');
    }
    if (this.clienteId === undefined) {
      throw new Error('AppUserPayloadJwt.Builder: clienteId is required');
    }
    if (this.apps === undefined) {
      throw new Error('AppUserPayloadJwt.Builder: apps is required');
    }

    return { sub: this.sub, clienteId: this.clienteId, apps: this.apps };
  }
}
