import { MAILER } from "$env/static/private";
import { err, ok } from "$lib/modules/result";
import { Resend } from "resend";

import {
  changeEmailTemplate,
  recoverPasswordTemplate,
  renderEmail,
  reservationTemplate,
  verifyEmailTemplate,
} from "./email-templates";
import { logger } from "./logger";

function getResend() {
  return new Resend(MAILER);
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
        html: renderEmail(payload.body),
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
      body: payload.body.replace("{{LINK}}", link.replaceAll("&", "&amp;")),
      text: payload.text.replace("{{LINK}}", link),
    });
  }

  async verifyEmail(data: { name: string; link: string; to: string }) {
    return this.sendWithLink({
      ...verifyEmailTemplate(data),
      link: data.link,
      to: data.to,
    });
  }

  async recoverPassword(data: { name: string; link: string; to: string }) {
    return this.sendWithLink({
      ...recoverPasswordTemplate(data),
      link: data.link,
      to: data.to,
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
    return this.sendWithLink({
      ...reservationTemplate(data),
      link: data.link,
      to: data.to,
    });
  }

  async changeEmail(data: { name: string; link: string; to: string }) {
    return this.sendWithLink({
      ...changeEmailTemplate(data),
      link: data.link,
      to: data.to,
    });
  }
}
