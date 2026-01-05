
import { Controller, Post, UseGuards, Request, Res, Body, Get } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('api')
export class AuthController {
    constructor(private authService: AuthService) { }

    // We are manually validating for now to bridge the gap, or we could use LocalGuard
    @Post('login')
    async login(@Body() body: any, @Res({ passthrough: true }) response: Response) {
        const user = await this.authService.validateUser(body.username, body.password);
        if (!user) {
            // Return 401 ideally, but replicating current behavior which might be specific
            response.status(401);
            return { message: 'Invalid credentials' };
        }

        const { access_token } = await this.authService.login(user);

        // Set JWT in HTTP-Only Cookie to be compatible with frontend expecting session behavior
        response.cookie('__Host-sid', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        });

        return { message: 'Login successful', user };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) response: Response) {
        response.clearCookie('__Host-sid');
        return { message: 'Logged out' };
    }
}
