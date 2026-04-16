#!/bin/bash
# Script to rename all Supabase table references to use backoffice_ prefix
# This updates TypeScript/JavaScript code to match the new schema

set -e

echo "🔧 Migrating table names in frontend-next codebase..."

# Find all TypeScript files (excluding node_modules)
FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*")

# Table mappings (old_name -> new_name)
declare -A TABLES=(
  ["business_info"]="backoffice_business_info"
  ["companies"]="backoffice_companies"
  ["contacts"]="backoffice_contacts"
  ["contact_associations"]="backoffice_contact_associations"
  ["projects"]="backoffice_projects"
  ["time_entries"]="backoffice_time_entries"
  ["time_entry_contacts"]="backoffice_time_entry_contacts"
  ["invoices"]="backoffice_invoices"
  ["invoice_items"]="backoffice_invoice_items"
  ["invoice_time_entries"]="backoffice_invoice_time_entries"
  ["invoice_attachments"]="backoffice_invoice_attachments"
  ["incoming_invoices"]="backoffice_incoming_invoices"
  ["receipts"]="backoffice_receipts"
  ["expense_categories"]="backoffice_expense_categories"
  ["emails"]="backoffice_emails"
  ["email_attachments"]="backoffice_email_attachments"
  ["tax_rates"]="backoffice_tax_rates"
  ["tax_years"]="backoffice_tax_years"
  ["tax_config"]="backoffice_tax_config"
  ["tax_benefits"]="backoffice_tax_benefits"
  ["tax_credits"]="backoffice_tax_credits"
  ["income_tax_brackets"]="backoffice_income_tax_brackets"
  ["arbeidskorting_brackets"]="backoffice_arbeidskorting_brackets"
  ["user_tax_settings"]="backoffice_user_tax_settings"
  ["user_benefit_selections"]="backoffice_user_benefit_selections"
  ["user_tax_credit_selections"]="backoffice_user_tax_credit_selections"
  ["vat_payments"]="backoffice_vat_payments"
)

# Iterate through each file
for file in $FILES; do
  # Make backup
  cp "$file" "$file.bak"

  # Apply all replacements for each table
  for old_table in "${!TABLES[@]}"; do
    new_table="${TABLES[$old_table]}"

    # Replace .from('table_name')
    sed -i "s/\.from('$old_table')/\.from('$new_table')/g" "$file"

    # Replace .from("table_name")
    sed -i "s/\.from(\"$old_table\")/\.from(\"$new_table\")/g" "$file"

    # Replace table name in SQL queries (various patterns)
    sed -i "s/ FROM $old_table / FROM $new_table /g" "$file"
    sed -i "s/ from $old_table / from $new_table /g" "$file"
    sed -i "s/FROM $old_table /FROM $new_table /g" "$file"
    sed -i "s/from $old_table /from $new_table /g" "$file"
    sed -i "s/UPDATE $old_table /UPDATE $new_table /g" "$file"
    sed -i "s/update $old_table /update $new_table /g" "$file"
    sed -i "s/INSERT INTO $old_table /INSERT INTO $new_table /g" "$file"
    sed -i "s/insert into $old_table /insert into $new_table /g" "$file"
    sed -i "s/DELETE FROM $old_table /DELETE FROM $new_table /g" "$file"
    sed -i "s/delete from $old_table /delete from $new_table /g" "$file"
  done
done

# Clean up backups if successful
echo "✅ Migration complete!"
echo "📝 Backup files created with .bak extension"
echo ""
echo "To remove backups: find src -name '*.bak' -delete"
echo "To restore backups: for f in src/**/*.bak; do mv \"\$f\" \"\${f%.bak}\"; done"
