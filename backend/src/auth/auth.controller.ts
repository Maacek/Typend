import { Controller, Post, UseGuards, Request, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Request() req: any) {
        const user = await this.authService.validateUser(req.body.email, req.body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('register')
    async register(@Request() req: any) {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            throw new UnauthorizedException('Chybějící údaje pro registraci');
        }
        const user = await this.authService.register(email, password, name);
        return this.authService.login(user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
