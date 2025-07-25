import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const FORMATS_DIR = path.resolve(process.cwd(), 'lib/formats');
  const files = fs.readdirSync(FORMATS_DIR);
  const formats = files.filter(f => f.endsWith('.json')).map(file => {
    const formatData = JSON.parse(fs.readFileSync(path.join(FORMATS_DIR, file), 'utf-8'));
    const formatKey = file.replace(/^format_/, '').replace(/\.json$/, '');
    return {
      name: formatData.format_name,
      description: formatData.description,
      min_teams: formatData.min_players || 0,
      max_teams: formatData.max_players || 999,
      total_matches: formatData.matches ? formatData.matches.length : 0,
      format_data: formatData,
      format_key: formatKey
    };
  });
  return NextResponse.json(formats);
} 