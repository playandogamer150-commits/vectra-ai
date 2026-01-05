
import { Injectable } from '@nestjs/common';
import { db } from '../../db';
import { appUsers } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
    async findOne(username: string): Promise<any> {
        const users = await db.select().from(appUsers).where(eq(appUsers.username, username)).limit(1);
        return users[0];
    }

    async findById(id: string): Promise<any> {
        const users = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
        return users[0];
    }
}
