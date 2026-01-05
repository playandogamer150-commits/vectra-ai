
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('api/profile')
export class ProfileController {
    constructor(private usersService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getProfile(@Request() req: any) {
        // In a real scenario, we might want to fetch fresh data from DB
        // instead of returning the JWT payload directly if there are updates.
        // The previous implementation fetched 'appUser' from storage.

        // req.user comes from JwtStrategy via JwtAuthGuard
        // payload = { userId, username }
        const userId = req.user.userId;
        const user = await this.usersService.findById(userId);

        // We can enrich this with the same logic as the Express route if needed (credits, limits, etc)
        // For now, mirroring basic profile fetch
        if (!user) {
            return { error: 'User not found' };
        }

        const { password, ...result } = user;
        return result;
    }
}
