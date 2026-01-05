import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';

import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';

@Module({
    imports: [AuthModule, UsersModule, ProfileModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
