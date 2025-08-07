import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Temporary hardcoded API key for testing
const resend = new Resend('re_YZfgVuqY_ECwJaa1cdiWJc6tU25cYSPBk');

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, confirmationUrl } = await request.json();

    console.log('=== EMAIL SEND REQUEST ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Confirmation URL:', confirmationUrl);
    console.log('HTML length:', html.length);
    console.log('==========================');

    // En mode développement SANS clé API, on affiche juste l'email dans la console
    if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY && !resend) {
      console.log('=== EMAIL DE CONFIRMATION ===');
      console.log('À:', to);
      console.log('Sujet:', subject);
      console.log('Lien de confirmation:', confirmationUrl);
      console.log('Contenu HTML:', html);
      console.log('=============================');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email logged to console (development mode)',
        confirmationUrl 
      });
    }

    // En production ou avec clé API, on utilise Resend
    if (!resend) {
      console.error('Resend not initialized');
      return NextResponse.json(
        { error: 'RESEND_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('Sending email via Resend...');
    const { data, error } = await resend.emails.send({
      from: 'PadelFlow <noreply@info.neyopadel.com>', // Votre domaine configuré
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