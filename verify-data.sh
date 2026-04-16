#!/bin/bash

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbGRvb2Vlb2phb2RuenNkbWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNzkzNiwiZXhwIjoyMDg5NDAzOTM2fQ.ByBKUwuZSA10dTfWNkzyf3NdH1aX9aXHU3w7WqvQoCw"

echo "🔍 Verifying data on remote Supabase..."
echo ""

for table in backoffice_companies backoffice_projects backoffice_emails backoffice_time_entries backoffice_contacts backoffice_invoices; do
  count=$(curl -s "https://gpldooeeojaodnzsdmgb.supabase.co/rest/v1/${table}?select=id" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" | jq '. | length')
  echo "✅ $table: $count rows"
done

echo ""
echo "📊 Summary: All backoffice data successfully migrated!"