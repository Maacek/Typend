import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'supersecret'),
        });
    }

    async validate(payload: any) {
        console.log('JWT Payload:', JSON.stringify(payload));
        return { userId: payload.sub, email: payload.email, role: payload.role, workspaceId: payload.workspaceId };
    }
}
