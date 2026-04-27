#!/bin/bash

BACKUP_FILE="/home/thartist/Desktop/riemerFYI/database-backups/riemerfyi_backup_20260416_071741.sql.gz"
OUTPUT_DIR="/home/thartist/Desktop/riemerFYI/frontend-next/public/pdfs"

echo "Extracting PDFs from backup: $BACKUP_FILE"
echo "Output directory: $OUTPUT_DIR"

# Create output directories
mkdir -p "$OUTPUT_DIR/invoices"
mkdir -p "$OUTPUT_DIR/expenses"

# Decompress and extract invoice PDFs
echo "Extracting invoice PDFs..."
zcat "$BACKUP_FILE" | grep -oP "COPY public.backoffice_invoices.*?\\\\\\." | head -20

echo "Done!"