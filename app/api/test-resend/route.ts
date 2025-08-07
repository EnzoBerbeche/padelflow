import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_YZfgVuqY_ECwJaa1cdiWJc6tU25cYSPBk');

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Resend configuration...');
    
    // Test 1: Vérifier la clé API
    console.log('API Key:', 're_YZfgVuqY_ECwJaa1cdiWJc6tU25cYSPBk');
    
    // Test 2: Essayer d'envoyer un email de test avec votre domaine
    const { data, error } = await resend.emails.send({
      from: 'PadelFlow <noreply@info.neyopadel.com>', // Votre domaine configuré
      to: ['enzoberbeche@opsconseil.com'], // Votre adresse email
      subject: 'Test Resend Configuration - PadelFlow',
      html: `
        <h1>Test Email PadelFlow</h1>
        <p>Si vous recevez cet email, Resend fonctionne parfaitement avec votre domaine !</p>
        <p>Votre clé API est valide et votre domaine info.neyopadel.com est configuré.</p>
        <p>Date: ${new Date().toLocaleString()}</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({
        success: false,
        error: error,
        message: 'Failed to send test email'
      });
    }

    console.log('Resend test successful:', data);
    return NextResponse.json({
      success: true,
      data: data,
      message: 'Resend configuration is working with your domain! Check your email at enzoberbeche@opsconseil.com'
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error,
      message: 'Error testing Resend configuration'
    });
  }
} 