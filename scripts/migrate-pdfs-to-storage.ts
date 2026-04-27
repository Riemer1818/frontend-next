import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'documents';
const SOURCE_DIR = 'public/pdfs';

interface UploadResult {
  localPath: string;
  storagePath: string;
  success: boolean;
  error?: string;
}

async function uploadFile(localPath: string, storagePath: string): Promise<UploadResult> {
  try {
    const fileBuffer = await fs.readFile(localPath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, blob, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      return { localPath, storagePath, success: false, error: error.message };
    }

    return { localPath, storagePath, success: true };
  } catch (err) {
    return { localPath, storagePath, success: false, error: String(err) };
  }
}

async function getAllPdfFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllPdfFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.pdf')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log('🚀 Starting PDF migration to Supabase Storage...\n');

  // Get all PDF files
  const allFiles = await getAllPdfFiles(SOURCE_DIR);
  console.log(`📁 Found ${allFiles.length} PDF files\n`);

  // Group by folder
  const folders: Record<string, string[]> = {};
  for (const file of allFiles) {
    const relativePath = path.relative(SOURCE_DIR, file);
    const folder = path.dirname(relativePath);
    if (!folders[folder]) folders[folder] = [];
    folders[folder].push(file);
  }

  // Display summary
  for (const [folder, files] of Object.entries(folders)) {
    console.log(`  ${folder}: ${files.length} files`);
  }
  console.log('');

  // Upload files
  const results: UploadResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const file of allFiles) {
    const relativePath = path.relative(SOURCE_DIR, file);
    const storagePath = relativePath; // Keep same structure in storage

    console.log(`📤 Uploading: ${relativePath}`);
    const result = await uploadFile(file, storagePath);
    results.push(result);

    if (result.success) {
      successCount++;
      console.log(`   ✅ Success`);
    } else {
      errorCount++;
      console.log(`   ❌ Error: ${result.error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   Total files: ${allFiles.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));

  // Show errors if any
  if (errorCount > 0) {
    console.log('\n❌ Failed uploads:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   ${r.localPath}: ${r.error}`));
  }

  // Verify bucket contents
  console.log('\n🔍 Verifying bucket contents...');
  for (const folder of Object.keys(folders)) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, { limit: 1000 });

    if (error) {
      console.log(`   ❌ Error listing ${folder}: ${error.message}`);
    } else {
      console.log(`   ${folder}: ${data?.length || 0} files in storage`);
    }
  }

  console.log('\n✨ Migration complete!');
}

main().catch(console.error);
