import { AppsPayload } from '../../common/jwt/apps-payload';

export class InternalUserPayloadJwt {
  sub!: number;
  email!: string;
  apps!: AppsPayload;

  static builder(): InternalUserPayloadJwtBuilder {
    return new InternalUserPayloadJwtBuilder();
  }
}

export class InternalUserPayloadJwtBuilder {
  private sub?: number;
  private email?: string;
  private apps?: AppsPayload;

  withSub(sub: number): this {
    this.sub = sub;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withApps(apps: AppsPayload): this {
    this.apps = apps;
    return this;
  }

  build(): InternalUserPayloadJwt {
    if (this.sub === undefined) {
      throw new Error('InternalUserPayloadJwt.Builder: sub is required');
    }
    if (this.email === undefined) {
      throw new Error('InternalUserPayloadJwt.Builder: email is required');
    }
    if (this.apps === undefined) {
      throw new Error('InternalUserPayloadJwt.Builder: apps is required');
    }

    return { sub: this.sub, email: this.email, apps: this.apps };
  }
}
