export function createConfirmationEmailHtml(
  tournamentName: string,
  playerNames: string[],
  confirmationUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation d'inscription - ${tournamentName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .title {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 30px;
        }
        .team-info {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .player {
          margin: 10px 0;
          padding: 10px;
          background-color: white;
          border-radius: 4px;
          border-left: 4px solid #2563eb;
        }
        .button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #1d4ed8;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏆 PadelFlow</div>
          <div class="title">Confirmation d'inscription</div>
        </div>
        
        <div class="content">
          <p>Bonjour,</p>
          
          <p>Votre inscription pour le tournoi <strong>${tournamentName}</strong> a été reçue avec succès.</p>
          
          <div class="team-info">
            <h3 style="margin-top: 0; color: #1f2937;">Votre équipe :</h3>
            ${playerNames.map(name => `<div class="player">👤 ${name}</div>`).join('')}
          </div>
          
          <p>Pour finaliser votre inscription, veuillez cliquer sur le bouton ci-dessous :</p>
          
          <div style="text-align: center;">
            <a href="${confirmationUrl}" class="button">
              ✅ Confirmer mon inscription
            </a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important :</strong> Ce lien expire dans 1 heure. Si vous ne confirmez pas votre inscription dans ce délai, elle sera automatiquement annulée.
          </div>
          
          <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${confirmationUrl}</p>
        </div>
        
        <div class="footer">
          <p>Ce message a été envoyé automatiquement par PadelFlow.</p>
          <p>Si vous n'avez pas demandé cette inscription, vous pouvez ignorer cet email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function createConfirmationEmailSubject(tournamentName: string): string {
  return `🏆 Confirmation d'inscription - ${tournamentName}`;
} 