import { BARBER_SHOP_DETAILS } from "$lib/constants";

export const EMAIL_COLORS = {
  background: "#fdfdfc",
  surface: "#f9f9f8",
  border: "#e9e8e6",
  text: "#21201c",
  mutedText: "#63635e",
  accent: "#3e63dd",
  accentDark: "#1f2d5c",
  accentSoft: "#edf2fe",
} as const;

export type EmailContent = { body: string; text: string; subject: string };

export function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function verifyEmailTemplate(data: { name: string }): EmailContent {
  return {
    body: `<p class="eyebrow">Account</p><h2>Verifica il tuo indirizzo email</h2><p>Ciao <strong>${escapeHtml(data.name)}</strong>,</p><p>Conferma il tuo indirizzo email per completare la creazione del tuo account Emi Hair Club.</p><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Verifica email</a></div><p class="helper-text">Se non hai richiesto tu questa email, puoi ignorarla in sicurezza.</p>`,
    text: `Verifica email\n\nCiao ${data.name},\nper confermare la tua utenza visita: {{LINK}}\n\nSe l'email ti è stata inviata per sbaglio, ignorala.`,
    subject: "Verifica email",
  };
}

export function recoverPasswordTemplate(data: { name: string }): EmailContent {
  return {
    body: `<p class="eyebrow">Sicurezza</p><h2>Imposta una nuova password</h2><p>Ciao <strong>${escapeHtml(data.name)}</strong>,</p><p>Abbiamo ricevuto una richiesta di modifica della password. Usa il pulsante qui sotto per sceglierne una nuova.</p><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Nuova password</a></div><p class="helper-text">Se non hai richiesto tu la modifica, puoi ignorare questa email.</p>`,
    text: `Cambio password\n\nCiao ${data.name},\nper confermare il cambio di password visita: {{LINK}}`,
    subject: "Richiesta di cambio password",
  };
}

export function reservationTemplate(data: {
  name: string;
  date: string;
  hour: string;
  staffName: string;
  serviceNames: string[];
}): EmailContent {
  const services = data.serviceNames.join(", ");
  return {
    body: `<p class="eyebrow">Prenotazione</p><h2>Conferma il tuo appuntamento</h2><p>Ciao <strong>${escapeHtml(data.name)}</strong>,</p><p>Grazie per aver scelto Emi Hair Club. Controlla i dettagli e conferma la prenotazione.</p><div class="detail-box"><h3 class="detail-title">Il tuo appuntamento</h3><table role="presentation" class="details"><tr><td>Data</td><th>${escapeHtml(data.date)}</th></tr><tr><td>Ora</td><th>${escapeHtml(data.hour)}</th></tr><tr><td>Staff</td><th>${escapeHtml(data.staffName)}</th></tr><tr><td>Servizi</td><th>${escapeHtml(services)}</th></tr></table></div><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Conferma prenotazione</a></div>`,
    text: `Conferma prenotazione\n\nCiao ${data.name},\nconferma la prenotazione: {{LINK}}\n\nData: ${data.date}\nOra: ${data.hour}\nStaff: ${data.staffName}\nServizi: ${services}`,
    subject: "Conferma prenotazione",
  };
}

export function changeEmailTemplate(data: { name: string }): EmailContent {
  return {
    body: `<p class="eyebrow">Account</p><h2>Conferma il nuovo indirizzo email</h2><p>Ciao <strong>${escapeHtml(data.name)}</strong>,</p><p>Usa il pulsante qui sotto per confermare il cambio del tuo indirizzo email.</p><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Conferma nuova email</a></div><p class="helper-text">Se non hai richiesto tu la modifica, puoi ignorare questa email.</p>`,
    text: `Cambio mail\n\nCiao ${data.name},\nper confermare il cambio di email visita: {{LINK}}`,
    subject: "Cambio mail",
  };
}

export function renderEmail(content: string, year = new Date().getFullYear()) {
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>Emi Hair Club</title>
    <style>
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; line-height: 1.6; }
      .page { width: 100%; }
      .email-container { width: 100%; max-width: 600px; margin: 0 auto; overflow: hidden; }
      .brand { padding: 28px 32px 24px; }
      .brand-name { margin: 0; font-size: 28px; line-height: 1; letter-spacing: .08em; }
      .brand-subtitle { margin: 8px 0 0; font-size: 12px; letter-spacing: .2em; }
      .content { padding: 36px 32px; }
      h2 { margin: 4px 0 24px; font-size: 26px; line-height: 1.2; }
      p { margin: 0 0 16px; }
      .eyebrow { margin: 0; color: ${EMAIL_COLORS.accent}; font-size: 12px; font-weight: bold; letter-spacing: .14em; text-transform: uppercase; }
      .detail-box { margin: 28px 0 0; padding: 20px 24px; border: 1px solid ${EMAIL_COLORS.border}; }
      .detail-title { margin: 0 0 12px; color: ${EMAIL_COLORS.accentDark}; font-size: 16px; }
      .details { width: 100%; border-collapse: collapse; }
      .details td, .details th { padding: 5px 0; vertical-align: top; }
      .details td { width: 32%; color: ${EMAIL_COLORS.mutedText}; }
      .details th { text-align: left; font-weight: 600; }
      .confirm-wrapper { padding: 16px 0 8px; text-align: center; }
      .confirm-button { display: inline-block; box-sizing: border-box; min-height: 36px; margin-top: 12px; padding: 7px 12px; border: 1px solid transparent; border-radius: 8px; background: rgba(33, 32, 28, .92); color: #fdfdfc !important; font-size: 14px; font-weight: 600; line-height: 20px; text-decoration: none; }
      .helper-text { margin-top: 24px; color: ${EMAIL_COLORS.mutedText}; font-size: 13px; }
      .salon-info { padding: 22px 32px; border-top: 1px solid ${EMAIL_COLORS.border}; color: ${EMAIL_COLORS.mutedText}; font-size: 13px; }
      .salon-info p { margin: 0; }
      .copyright { margin-top: 8px !important; font-size: 12px; }
      @media only screen and (max-width: 480px) { .brand, .content, .salon-info { padding-left: 22px; padding-right: 22px; } h2 { font-size: 23px; } }
    </style>
  </head>
  <body>
    <table role="presentation" class="page" cellspacing="0" cellpadding="0"><tr><td>
      <div class="email-container">
        <div class="brand"><h1 class="brand-name">EMI</h1><p class="brand-subtitle">HAIR CLUB</p></div>
        <main class="content">${content}</main>
        <footer class="salon-info"><p><strong>Emi Hair Club</strong><br />${escapeHtml(BARBER_SHOP_DETAILS.street ?? "")}</p><p class="copyright">© ${year} Emi Hair Club</p></footer>
      </div>
    </td></tr></table>
  </body>
</html>`;
}
