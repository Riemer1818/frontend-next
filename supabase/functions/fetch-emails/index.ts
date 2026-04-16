// Supabase Edge Function for fetching emails
// Runs on Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Email {
  uid: number;
  message_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  subject: string;
  received_date: string;
  body_text: string | null;
  body_html: string | null;
  has_attachments: boolean;
  is_read: boolean;
  raw_headers: Record<string, unknown>;
}

interface Attachment {
  email_uid: number;
  filename: string;
  content_type: string;
  size: number;
  content: Uint8Array;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!authHeader || !cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providedSecret = authHeader.replace('Bearer ', '');
    if (providedSecret !== cronSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const imapUser = Deno.env.get('IMAP_USER')!;
    const imapPassword = Deno.env.get('IMAP_PASSWORD')!;
    const imapHost = Deno.env.get('IMAP_HOST')!;
    const imapPort = parseInt(Deno.env.get('IMAP_PORT') || '993');

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch emails from IMAP
    console.log(`📧 Connecting to IMAP: ${imapHost}:${imapPort}`);

    const emails = await fetchEmailsFromIMAP({
      user: imapUser,
      password: imapPassword,
      host: imapHost,
      port: imapPort,
    });

    console.log(`✅ Fetched ${emails.length} emails from IMAP`);

    // Save emails to database
    let savedCount = 0;
    for (const email of emails) {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('emails')
        .select('uid')
        .eq('uid', email.uid)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('emails')
          .insert({
            uid: email.uid,
            message_id: email.message_id,
            from_address: email.from_address,
            from_name: email.from_name,
            to_address: email.to_address,
            subject: email.subject,
            received_date: email.received_date,
            body_text: email.body_text,
            body_html: email.body_html,
            has_attachments: email.has_attachments,
            is_read: email.is_read,
            raw_headers: email.raw_headers,
          });

        if (!error) {
          savedCount++;
        } else {
          console.error(`Failed to save email ${email.uid}:`, error);
        }
      }
    }

    console.log(`💾 Saved ${savedCount} new emails to database`);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: emails.length,
        saved: savedCount,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-emails function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Fetch emails from IMAP server
 * Note: This is a simplified version. In production, you'd want to use a proper IMAP library.
 * For Deno, you might need to create a custom IMAP client or call an external service.
 */
async function fetchEmailsFromIMAP(config: {
  user: string;
  password: string;
  host: string;
  port: number;
}): Promise<Email[]> {
  // TODO: Implement actual IMAP fetching
  // For now, this is a placeholder that returns empty array
  // You have two options:
  // 1. Implement IMAP in Deno (complex, no good libraries)
  // 2. Call your Next.js API endpoint from here (simpler)

  console.warn('⚠️  IMAP fetching not implemented in edge function yet');
  console.warn('    Consider calling the Next.js tRPC endpoint instead');

  return [];
}
