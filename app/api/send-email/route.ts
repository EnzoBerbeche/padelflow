import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with environment variable
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, confirmationUrl } = await request.json();

    // En mode développement SANS clé API, on affiche juste l'email dans la console
    if (process.env.NODE_ENV === 'development' && !resend) {
      console.log('=== EMAIL DE CONFIRMATION (DEV MODE) ===');
      console.log('À:', to);
      console.log('Sujet:', subject);
      console.log('Lien de confirmation:', confirmationUrl);
      console.log('========================================');

      return NextResponse.json({
        success: true,
        message: 'Email logged to console (development mode)',
        confirmationUrl
      });
    }

    // En production, on utilise Resend
    if (!resend) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'RESEND_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('Sending email via Resend...');
    const { data, error } = await resend.emails.send({
      from: 'NeyoPadel <noreply@neyopadel.com>',
      to: [to], // Envoi à l'adresse réelle
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({ 
      success: true, 
      data,
      message: `Email sent to ${to}`
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 