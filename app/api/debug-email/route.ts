import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_YZfgVuqY_ECwJaa1cdiWJc6tU25cYSPBk');

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, confirmationUrl } = await request.json();
    
    console.log('=== DEBUG EMAIL ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Confirmation URL:', confirmationUrl);
    console.log('HTML length:', html.length);
    console.log('==================');

    const { data, error } = await resend.emails.send({
      from: 'PadelFlow <noreply@info.neyopadel.com>',
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({
        success: false,
        error: error,
        message: 'Failed to send email'
      });
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({
      success: true,
      data: data,
      message: `Email sent to ${to}`
    });

  } catch (error) {
    console.error('Debug email error:', error);
    return NextResponse.json({
      success: false,
      error: error,
      message: 'Error in debug email'
    });
  }
} 