import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DepartmentsModule } from './departments/departments.module';
import { MailerModule } from './mailer/mailer.module';

// Bundles the org-wide, non-domain-specific pieces: identity (auth,
// users), org structure (departments), cross-module notifications, and
// the shared SMTP transport. assets/helpdesk/payroll depend on this;
// this never depends on them.
@Module({
  imports: [AuthModule, UsersModule, NotificationsModule, DepartmentsModule, MailerModule],
  exports: [AuthModule, UsersModule, NotificationsModule, DepartmentsModule, MailerModule],
})
export class CoreModule {}
