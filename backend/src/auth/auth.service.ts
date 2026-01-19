import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        console.log('User found in DB:', JSON.stringify(user));
        if (user && await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        console.log('Logging in user:', JSON.stringify(user));
        const payload = { email: user.email, sub: user.id, role: user.role, workspaceId: user.workspaceId };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                workspaceId: user.workspaceId,
            },
        };
    }

    async register(email: string, pass: string, name: string) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new UnauthorizedException('Uživatel s tímto emailem již existuje');
        }

        const hashedPassword = await bcrypt.hash(pass, 10);

        // Create Workspace and User in a transaction
        return this.prisma.$transaction(async (tx) => {
            const workspace = await tx.workspace.create({
                data: {
                    name: `${name}'s Workspace`,
                },
            });

            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    workspaceId: workspace.id,
                    role: 'ADMIN', // First user in workspace is Admin
                },
            });

            return user;
        });
    }
}
