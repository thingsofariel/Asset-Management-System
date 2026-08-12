-- Ported verbatim from the original Payslip project's migration
-- (prisma/migrations/0001_init/migration.sql). Table and column names
-- match the unified schema.prisma's @@map/@map values exactly
-- (earning_details, deduction_details, payslips, payslip_id,
-- basic_salary, total_earnings, total_deductions, net_pay, updated_at)
-- so this applies unchanged.
--
-- Prisma's schema.prisma can't declare triggers/functions — this has
-- to be added as raw SQL. Two ways to apply it:
--
--   1. After your first `prisma migrate dev` against the unified
--      schema, run `prisma migrate dev --create-only --name
--      recalc_payslip_totals_trigger`, then paste this file's content
--      into the generated empty migration.sql before running
--      `prisma migrate deploy` (or letting --create-only prompt you
--      to apply it).
--   2. Or just run this file directly against the database with
--      psql once the initial schema exists:
--        psql "$DATABASE_URL" -f prisma/manual-migrations/recalc-payslip-totals-trigger.sql
--
-- Without this trigger, PayslipsService.create() will still insert
-- rows correctly, but totalEarnings/totalDeductions/netPay on the
-- Payslip row will stay at their zero defaults — the trigger is what
-- actually computes them whenever a line item is inserted, updated,
-- or deleted.

CREATE OR REPLACE FUNCTION recalc_payslip_totals() RETURNS TRIGGER AS $$
DECLARE
    target_payslip_id INTEGER;
    v_earnings DECIMAL(14,2);
    v_deductions DECIMAL(14,2);
    v_basic DECIMAL(14,2);
BEGIN
    target_payslip_id := COALESCE(NEW.payslip_id, OLD.payslip_id);

    SELECT COALESCE(SUM(amount), 0) INTO v_earnings
        FROM earning_details WHERE payslip_id = target_payslip_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_deductions
        FROM deduction_details WHERE payslip_id = target_payslip_id;

    SELECT basic_salary INTO v_basic
        FROM payslips WHERE payslip_id = target_payslip_id;

    UPDATE payslips
    SET total_earnings   = v_basic + v_earnings,
        total_deductions = v_deductions,
        net_pay          = (v_basic + v_earnings) - v_deductions,
        updated_at       = now()
    WHERE payslip_id = target_payslip_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_on_earning
AFTER INSERT OR UPDATE OR DELETE ON earning_details
FOR EACH ROW EXECUTE FUNCTION recalc_payslip_totals();

CREATE TRIGGER trg_recalc_on_deduction
AFTER INSERT OR UPDATE OR DELETE ON deduction_details
FOR EACH ROW EXECUTE FUNCTION recalc_payslip_totals();
