import {Injectable} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-jwt";
import {ConfigService} from "@nestjs/config";
import {TenantAuthService} from "../tenant-auth.service";
import {JwtPayload} from "../interfaces/jwt.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(
      private readonly tenantAuthService: TenantAuthService,
      private readonly configService: ConfigService,
    ) {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: configService.getOrThrow<string>('TENANT_JWT_SECRET'),
        algorithms: ['HS256']
      });
    }

    async validate(payload: JwtPayload) {
      return await this.tenantAuthService.validate(payload);
    }
}