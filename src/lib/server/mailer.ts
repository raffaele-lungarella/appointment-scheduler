import { MAILER } from "$env/static/private";
import { BARBER_SHOP_DETAILS } from "$lib/constants";
import { err, ok } from "$lib/modules/result";
import { Resend } from "resend";

import { logger } from "./logger";

function getResend() {
  return new Resend(MAILER);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function httpUrl(value: string) {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

function recipientDomain(recipient: string) {
  const separator = recipient.lastIndexOf("@");
  return separator > -1 ? recipient.slice(separator + 1).toLowerCase() : "invalid";
}

type EmailPayload = { body: string; text: string; to: string; subject: string };

export class EmailService {
  #from = "Emi Hair Club <users@mailer.emihairclub.com>";

  private async send(payload: EmailPayload) {
    try {
      const emailResponse = await getResend().emails.send({
        from: this.#from,
        to: payload.to,
        subject: payload.subject,
        html: TEMPLATE(payload.body),
        text: payload.text,
      });

      if (emailResponse.data) return ok(emailResponse.data.id);
      throw new Error("Resend returned no email data");
    } catch (error) {
      logger.error(
        { err: error, recipientDomain: recipientDomain(payload.to), subject: payload.subject },
        "Could not send email",
      );
      return err("generic-error");
    }
  }

  private async sendWithLink(payload: EmailPayload & { link: string }) {
    const link = httpUrl(payload.link);
    if (!link) {
      logger.warn({ subject: payload.subject }, "Refused to send email with invalid link");
      return err("generic-error");
    }
    return this.send({
      ...payload,
      body: payload.body.replace("{{LINK}}", escapeHtml(link)),
      text: payload.text.replace("{{LINK}}", link),
    });
  }

  async verifyEmail(data: { name: string; link: string; to: string }) {
    const name = escapeHtml(data.name);
    return this.sendWithLink({
      body: `<p>Verifica email</p><hr /><p>Ciao <strong>${name}</strong>,</p><p>Per confermare la tua utenza clicca il pulsante in basso.</p><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Verifica email</a></div><p>Se l'email ti è stata inviata per sbaglio, ignorala</p>`,
      text: `Verifica email\n\nCiao ${data.name},\nper confermare la tua utenza visita: {{LINK}}\n\nSe l'email ti è stata inviata per sbaglio, ignorala.`,
      link: data.link,
      to: data.to,
      subject: "Verifica email",
    });
  }

  async recoverPassword(data: { name: string; link: string; to: string }) {
    const name = escapeHtml(data.name);
    return this.sendWithLink({
      body: `<p>Cambio password</p><hr /><p>Ciao <strong>${name}</strong>,</p><p>Per confermare il cambio di password clicca il link.</p><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Nuova password</a></div>`,
      text: `Cambio password\n\nCiao ${data.name},\nper confermare il cambio di password visita: {{LINK}}`,
      link: data.link,
      to: data.to,
      subject: "Richiesta di cambio password",
    });
  }

  async newReservation(data: {
    name: string;
    date: string;
    hour: string;
    staffName: string;
    serviceNames: string[];
    link: string;
    to: string;
  }) {
    const services = data.serviceNames.join(", ");
    return this.sendWithLink({
      body: `<p>Conferma prenotazione</p><hr /><p>Ciao <strong>${escapeHtml(data.name)}</strong>,</p><p>Grazie per aver prenotato un appuntamento presso Emi Hair Club! Per continuare conferma la prenotazione con il pulsante in basso.</p><div class="detail-box"><h3 class="detail-title">Dettagli della prenotazione</h3><p><strong>Data: </strong> ${escapeHtml(data.date)}</p><p><strong>Ora: </strong> ${escapeHtml(data.hour)}</p><p><strong>Staff: </strong> ${escapeHtml(data.staffName)}</p><p><strong>Servizi: </strong> ${escapeHtml(services)}</p></div><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Conferma Prenotazione</a></div>`,
      text: `Conferma prenotazione\n\nCiao ${data.name},\nconferma la prenotazione: {{LINK}}\n\nData: ${data.date}\nOra: ${data.hour}\nStaff: ${data.staffName}\nServizi: ${services}`,
      link: data.link,
      to: data.to,
      subject: "Conferma prenotazione",
    });
  }

  async changeEmail(data: { name: string; link: string; to: string }) {
    return this.sendWithLink({
      body: `<p>Cambio mail</p><hr /><p>Ciao <strong>${escapeHtml(data.name)}</strong>,</p><p>Per confermare il cambio di mail clicca il link.</p><div class="confirm-wrapper"><a class="confirm-button" href="{{LINK}}">Verifica cambio email</a></div>`,
      text: `Cambio mail\n\nCiao ${data.name},\nper confermare il cambio di email visita: {{LINK}}`,
      link: data.link,
      to: data.to,
      subject: "Cambio mail",
    });
  }
}

const TEMPLATE = (content: string) => `
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Emi Hair Club</title>
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .email-container { border: 1px solid #e1e1e1; border-radius: 5px; overflow: hidden; padding: 2rem; }
      .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666666; }
      h1 { margin: 0; font-size: 24px; }
      p { margin-bottom: 15px; }
      .salon-info { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e1e1e1; font-size: 14px; }
      hr { display: block; height: 1px; border: 0; border-top: 1px solid #ccc; margin: 1em 0; padding: 0; }
      .detail-box { background-color: #f9fafb; border-radius: 20px; padding: 2rem; }
      .detail-title { margin: 0; }
      .confirm-button { display: inline-block; margin-top: 30px; padding: 15px 25px; border-radius: 15px; background-color: #17a34a; color: white !important; text-decoration: none; font-weight: bold; text-align: center; }
      .confirm-wrapper { text-align: center; }
    </style>
  </head>
  <body class="email-container">
    <h1>Emi Hair Club</h1>
    ${content}
    <div class="salon-info">
      <p><strong>Emi Hair Club</strong><br />${escapeHtml(BARBER_SHOP_DETAILS.street ?? "")}</p>
      <div class="footer"><p>${new Date().getFullYear()} Emi Hair Club</p></div>
    </div>
  </body>
</html>`;
