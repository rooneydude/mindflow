import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple hash function (SHA-256 via Web Crypto)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_mindflow_journal_salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Check if PIN is set
export async function GET() {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'journal_pin_hash')
    .single();

  return NextResponse.json({ hasPin: !!data });
}

// Set or verify PIN
export async function POST(request: NextRequest) {
  const { action, pin } = await request.json();

  if (!pin || pin.length < 4) {
    return NextResponse.json({ error: 'PIN must be at least 4 characters' }, { status: 400 });
  }

  const hashed = await hashPin(pin);

  if (action === 'set') {
    // Set new PIN
    const { data: existing } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'journal_pin_hash')
      .single();

    if (existing) {
      return NextResponse.json({ error: 'PIN already set. Use verify to unlock.' }, { status: 400 });
    }

    await supabase
      .from('app_settings')
      .insert({ key: 'journal_pin_hash', value: hashed });

    return NextResponse.json({ success: true });
  }

  if (action === 'verify') {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'journal_pin_hash')
      .single();

    if (!data) {
      return NextResponse.json({ error: 'No PIN set' }, { status: 400 });
    }

    const valid = data.value === hashed;
    return NextResponse.json({ valid });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
