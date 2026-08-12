import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { RequestsModule } from './requests/requests.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [CategoriesModule, RequestsModule, ReportsModule],
})
export class HelpdeskModule {}
