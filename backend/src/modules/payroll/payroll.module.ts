import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
import { PayslipsModule } from './payslips/payslips.module';
import { BulkImportModule } from './bulk-import/bulk-import.module';

@Module({
  imports: [EmployeesModule, PayslipsModule, BulkImportModule],
})
export class PayrollModule {}
