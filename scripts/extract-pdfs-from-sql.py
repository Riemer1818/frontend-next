#!/usr/bin/env python3
import gzip
import re
import os

BACKUP_FILE = "/home/thartist/Desktop/riemerFYI/database-backups/riemerfyi_backup_20260416_071741.sql.gz"
OUTPUT_DIR = "/home/thartist/Desktop/riemerFYI/frontend-next/public/pdfs"

os.makedirs(f"{OUTPUT_DIR}/invoices", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/expenses", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/email-attachments", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/invoice-attachments", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/receipts", exist_ok=True)

print(f"Reading backup file: {BACKUP_FILE}")

invoice_count = 0
expense_count = 0
email_att_count = 0
inv_att_count = 0
receipt_count = 0

with gzip.open(BACKUP_FILE, 'rt', encoding='utf-8', errors='ignore') as f:
    in_invoices = False
    in_expenses = False
    in_email_attachments = False
    in_invoice_attachments = False
    in_receipts = False

    for line in f:
        # Check for start of tables
        if 'COPY public.invoices (' in line:
            in_invoices = True
            print("Found invoices table, extracting...")
            continue

        if 'COPY public.incoming_invoices (' in line:
            in_expenses = True
            print("Found expenses table, extracting...")
            continue

        if 'COPY public.email_attachments (' in line:
            in_email_attachments = True
            print("Found email_attachments table, extracting...")
            continue

        if 'COPY public.invoice_attachments (' in line:
            in_invoice_attachments = True
            print("Found invoice_attachments table, extracting...")
            continue

        if 'COPY public.receipts (' in line:
            in_receipts = True
            print("Found receipts table, extracting...")
            continue

        # Check for end of data
        if line.strip() == '\\.':
            if in_invoices:
                in_invoices = False
                print(f"Finished invoices: extracted {invoice_count} PDFs")
            if in_expenses:
                in_expenses = False
                print(f"Finished expenses: extracted {expense_count} PDFs")
            if in_email_attachments:
                in_email_attachments = False
                print(f"Finished email_attachments: extracted {email_att_count} PDFs")
            if in_invoice_attachments:
                in_invoice_attachments = False
                print(f"Finished invoice_attachments: extracted {inv_att_count} PDFs")
            if in_receipts:
                in_receipts = False
                print(f"Finished receipts: extracted {receipt_count} PDFs")
            continue

        # Process invoice row
        if in_invoices:
            parts = line.split('\t')
            if len(parts) > 13:
                invoice_id = parts[0]
                invoice_number = parts[3]
                pdf_hex = parts[13]

                if pdf_hex and pdf_hex.startswith('\\\\x') and len(pdf_hex) > 100:
                    try:
                        hex_str = pdf_hex[3:]
                        pdf_bytes = bytes.fromhex(hex_str)
                        if pdf_bytes[:4] == b'%PDF':
                            filename = f"{OUTPUT_DIR}/invoices/{invoice_number}.pdf"
                            with open(filename, 'wb') as pdf_file:
                                pdf_file.write(pdf_bytes)
                            invoice_count += 1
                            print(f"✓ Saved {invoice_number}.pdf ({len(pdf_bytes):,} bytes)")
                    except Exception as e:
                        print(f"✗ Failed to extract invoice {invoice_number}: {e}")

        # Process expense row
        if in_expenses:
            parts = line.split('\t')
            if len(parts) > 19:
                expense_id = parts[0]
                invoice_number = parts[3] if parts[3] not in ['\\N', ''] else f"expense_{expense_id}"
                pdf_hex = parts[19]

                if pdf_hex and pdf_hex.startswith('\\\\x') and len(pdf_hex) > 100:
                    try:
                        hex_str = pdf_hex[3:]
                        pdf_bytes = bytes.fromhex(hex_str)
                        if pdf_bytes[:4] == b'%PDF':
                            safe_filename = re.sub(r'[^\w\-.]', '_', invoice_number)
                            filename = f"{OUTPUT_DIR}/expenses/{safe_filename}.pdf"
                            with open(filename, 'wb') as pdf_file:
                                pdf_file.write(pdf_bytes)
                            expense_count += 1
                            print(f"✓ Saved expense {safe_filename}.pdf ({len(pdf_bytes):,} bytes)")
                    except Exception as e:
                        print(f"✗ Failed to extract expense {invoice_number}: {e}")

        # Process email_attachments row
        if in_email_attachments:
            parts = line.split('\t')
            # Schema: id, email_id, filename, mime_type, file_size, file_data, is_inline, content_id, created_at
            # file_data is at index 5
            if len(parts) > 5:
                att_id = parts[0]
                filename = parts[2] if len(parts) > 2 else f"email_att_{att_id}"
                mime_type = parts[3] if len(parts) > 3 else ''
                file_hex = parts[5]

                if file_hex and file_hex.startswith('\\\\x') and len(file_hex) > 100:
                    # Only extract PDFs
                    if 'pdf' in mime_type.lower():
                        try:
                            hex_str = file_hex[3:]
                            file_bytes = bytes.fromhex(hex_str)
                            if file_bytes[:4] == b'%PDF':
                                safe_filename = re.sub(r'[^\w\-.]', '_', filename)
                                output_filename = f"{OUTPUT_DIR}/email-attachments/{att_id}_{safe_filename}"
                                with open(output_filename, 'wb') as pdf_file:
                                    pdf_file.write(file_bytes)
                                email_att_count += 1
                                print(f"✓ Saved email attachment {safe_filename} ({len(file_bytes):,} bytes)")
                        except Exception as e:
                            print(f"✗ Failed to extract email attachment {filename}: {e}")

        # Process invoice_attachments row
        if in_invoice_attachments:
            parts = line.split('\t')
            # Schema: id, incoming_invoice_id, file_data, file_name, file_type, file_size, attachment_type, created_at, updated_at
            # file_data is at index 2
            if len(parts) > 2:
                att_id = parts[0]
                invoice_id = parts[1]
                file_hex = parts[2]
                filename = parts[3] if len(parts) > 3 else f"inv_att_{att_id}"
                file_type = parts[4] if len(parts) > 4 else ''

                if file_hex and file_hex.startswith('\\\\x') and len(file_hex) > 100:
                    # Only extract PDFs
                    if 'pdf' in file_type.lower():
                        try:
                            hex_str = file_hex[3:]
                            file_bytes = bytes.fromhex(hex_str)
                            if file_bytes[:4] == b'%PDF':
                                safe_filename = re.sub(r'[^\w\-.]', '_', filename)
                                output_filename = f"{OUTPUT_DIR}/invoice-attachments/expense_{invoice_id}_{safe_filename}"
                                with open(output_filename, 'wb') as pdf_file:
                                    pdf_file.write(file_bytes)
                                inv_att_count += 1
                                print(f"✓ Saved invoice attachment {safe_filename} ({len(file_bytes):,} bytes)")
                        except Exception as e:
                            print(f"✗ Failed to extract invoice attachment {filename}: {e}")

        # Process receipts row
        if in_receipts:
            parts = line.split('\t')
            # Schema: id, incoming_invoice_id, file_name, file_data, file_type, file_size, description, uploaded_at
            # file_data is at index 3
            if len(parts) > 3:
                receipt_id = parts[0]
                invoice_id = parts[1]
                filename = parts[2] if len(parts) > 2 else f"receipt_{receipt_id}"
                file_hex = parts[3]
                file_type = parts[4] if len(parts) > 4 else ''

                if file_hex and file_hex.startswith('\\\\x') and len(file_hex) > 100:
                    # Only extract PDFs
                    if 'pdf' in file_type.lower():
                        try:
                            hex_str = file_hex[3:]
                            file_bytes = bytes.fromhex(hex_str)
                            if file_bytes[:4] == b'%PDF':
                                safe_filename = re.sub(r'[^\w\-.]', '_', filename)
                                output_filename = f"{OUTPUT_DIR}/receipts/expense_{invoice_id}_{safe_filename}"
                                with open(output_filename, 'wb') as pdf_file:
                                    pdf_file.write(file_bytes)
                                receipt_count += 1
                                print(f"✓ Saved receipt {safe_filename} ({len(file_bytes):,} bytes)")
                        except Exception as e:
                            print(f"✗ Failed to extract receipt {filename}: {e}")

total = invoice_count + expense_count + email_att_count + inv_att_count + receipt_count
print(f"\n{'='*60}")
print(f"Done! PDFs extracted to: {OUTPUT_DIR}")
print(f"  Invoices:           {invoice_count}")
print(f"  Expenses:           {expense_count}")
print(f"  Email Attachments:  {email_att_count}")
print(f"  Invoice Attachments:{inv_att_count}")
print(f"  Receipts:           {receipt_count}")
print(f"{'='*60}")
print(f"TOTAL: {total} PDFs")
print(f"{'='*60}")
