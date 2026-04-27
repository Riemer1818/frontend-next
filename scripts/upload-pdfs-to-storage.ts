#!/usr/bin/env tsx
/**
 * Upload all extracted PDFs to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const STORAGE_BUCKET = 'documents';
const PDF_BASE_DIR = path.join(__dirname, '../public/pdfs');

interface UploadStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

async function ensureBucketExists() {
  console.log('\n📦 Checking if storage bucket exists...');

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Failed to list buckets:', listError);
    return false;
  }

  const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);

  if (bucketExists) {
    console.log('✅ Bucket "documents" already exists');
    return true;
  }

  console.log('📦 Creating bucket "documents"...');
  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  });

  if (createError) {
    console.error('❌ Failed to create bucket:', createError);
    return false;
  }

  console.log('✅ Created bucket "documents"');
  return true;
}

async function uploadFile(
  filePath: string,
  storagePath: string,
  stats: UploadStats
): Promise<void> {
  stats.total++;

  try {
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    console.log(`\n📤 Uploading ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)...`);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      stats.failed++;
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`   ✅ Uploaded: ${publicUrlData.publicUrl}`);
    stats.success++;
  } catch (err) {
    console.error(`   ❌ Exception: ${err}`);
    stats.failed++;
  }
}

async function uploadDirectory(
  localDir: string,
  storagePrefix: string,
  stats: UploadStats
): Promise<void> {
  try {
    const files = await fs.readdir(localDir);
    const pdfFiles = files.filter((f) => f.endsWith('.pdf'));

    console.log(`\n📂 Found ${pdfFiles.length} PDFs in ${path.basename(localDir)}/`);

    for (const file of pdfFiles) {
      const localPath = path.join(localDir, file);
      const storagePath = `${storagePrefix}/${file}`;
      await uploadFile(localPath, storagePath, stats);
    }
  } catch (err) {
    console.error(`❌ Failed to read directory ${localDir}:`, err);
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📦 UPLOADING PDFs TO SUPABASE STORAGE');
  console.log('='.repeat(70));

  // Ensure bucket exists
  const bucketReady = await ensureBucketExists();
  if (!bucketReady) {
    console.error('\n❌ Cannot proceed without storage bucket');
    process.exit(1);
  }

  const stats: UploadStats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  // Upload all PDF directories
  await uploadDirectory(path.join(PDF_BASE_DIR, 'invoices'), 'invoices', stats);
  await uploadDirectory(path.join(PDF_BASE_DIR, 'expenses'), 'expenses', stats);
  await uploadDirectory(path.join(PDF_BASE_DIR, 'email-attachments'), 'email-attachments', stats);
  await uploadDirectory(
    path.join(PDF_BASE_DIR, 'invoice-attachments'),
    'invoice-attachments',
    stats
  );
  await uploadDirectory(path.join(PDF_BASE_DIR, 'receipts'), 'receipts', stats);

  console.log('\n' + '='.repeat(70));
  console.log('✅ UPLOAD COMPLETE');
  console.log('='.repeat(70));
  console.log(`\nTotal:   ${stats.total}`);
  console.log(`Success: ${stats.success}`);
  console.log(`Failed:  ${stats.failed}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log('\n' + '='.repeat(70));
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
