import { Resend } from "resend";
import { MAILER } from "$env/static/private";
import { BARBER_SHOP_DETAILS } from "$lib/constants";
import { logger } from "./logger";
import { err, ok } from "$lib/modules/result";

const resend = new Resend(MAILER);

export class EmailService {
	#from = "Emi Hair Club <users@mailer.emihairclub.com>";
	private async send(payload: { body: string; to: string; subject: string }) {
		try {
			const emailResponse = await resend.emails.send({
				// from: mailer,
				from: this.#from,
				to: payload.to,
				subject: payload.subject,
				html: `${TEMPLATE(payload.body)}`,
			});

			if (emailResponse.data) {
				return ok(emailResponse.data.id);
			} else {
				throw new Error("");
			}
		} catch {
			logger.error({ payload }, `Could not send email with payload: `);
			return err("generic-error");
		}
	}

	async verifyEmail(data: { name: string; link: string; to: string }) {
		const body = `
		<p>Verifica email</p>
		<hr />

		<p>Ciao <strong>${data.name}</strong>,</p>
		<p>Per confermare la tua utenza clicca il pulsante in basso.</p>

		<div class="confirm-wrapper">
		<a class="confirm-button" href="${data.link}">Verifica email</a>
		</div>

		<p>Se l'email ti è stata inviata per sbaglio, ignorala</p>
		`;
		return await this.send({ body, to: data.to, subject: "Verifica email" });
	}

	async recoverPassword(data: { name: string; link: string; to: string }) {
		const body = `
			<p>Cambio password</p>
			<hr />

			<p>Ciao <strong>${data.name}</strong>,</p>
			<p>Per confermare il cambio di password clicca il link.</p>

			<div class="confirm-wrapper">
			<a class="confirm-button" href="${data.link}">Nuova password</a>
			</div>
			`;

		return await this.send({ body, to: data.to, subject: "Richiesta di cambio password" });
	}

	async newReservation(data: {
		name: string;
		date: string;
		hour: string;
		staffName: string;
		serviceName: string;
		link: string;
		to: string;
	}) {
		const body = `
		<p>Conferma prenotazione</p>
		<hr />

		<p>Ciao <strong>${data.name}</strong>,</p>
		<p>Grazie per aver prenotato un appuntamento presso Emi Hair Club! Per continuare conferma la prenotazione con il pulsante in basso.</p>

		<div class="detail-box">
		<h3 class="detail-title">Dettagli della prenotazione</h3>
		<p><strong>Data: </strong> ${data.date}</p>
		<p><strong>Ora: </strong> ${data.hour}</p>
		<p><strong>Staff: </strong> ${data.staffName}</p>
		<p><strong>Servizio: </strong> ${data.serviceName}</p>
		</div>

		<div class="confirm-wrapper">
		<a class="confirm-button" href="${data.link}">Conferma Prenotazione</a>
		</div>
		`;

		return await this.send({ body, to: data.to, subject: "Conferma prenotazione" });
	}

	async changeEmail(data: { name: string; link: string; to: string }) {
		const body = `
			<p>Cambio mail</p>
			<hr />

			<p>Ciao <strong>${data.name}</strong>,</p>
			<p>Per confermare il cambio di mail clicca il link.</p>

			<div class="confirm-wrapper">
			<a class="confirm-button" href="${data.link}">Verifica cambio email</a>
			</div>
		`;

		return await this.send({ body, to: data.to, subject: "Cambio mail" });
	}
}

const TEMPLATE = (CONTENT: string) =>
	`
	<!doctype html>
	<html lang="it">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>Cambio Email</title>
			<style>
				body {
					font-family: 'Helvetica Neue', Arial, sans-serif;
					line-height: 1.6;
					color: #333333;
					max-width: 600px;
					margin: 0 auto;
					padding: 20px;
				}

				.email-container {
					border: 1px solid #e1e1e1;
					border-radius: 5px;
					overflow: hidden;
					padding: 2rem;
				}

				.content {
					padding: 30px;
					background-color: #ffffff;
				}

				.footer {
					background-color: #f5f5f5;
					padding: 15px;
					text-align: center;
					font-size: 12px;
					color: #666666;
				}

				h1 {
					margin: 0;
					font-size: 24px;
				}

				p {
					margin-bottom: 15px;
				}

				.salon-info {
					margin-top: 30px;
					padding-top: 15px;
					border-top: 1px solid #e1e1e1;
					font-size: 14px;
				}

				hr {
					display: block;
					height: 1px;
					border: 0;
					border-top: 1px solid #ccc;
					margin: 1em 0;
					padding: 0;
				}

				.detail-box {
					background-color: #f9fafb;
					border-radius: 20px;
					padding: 2rem;
				}

				.detail-title {
					margin: 0px;
				}

				.confirm-button {
					display: inline-block;
					margin-top: 30px;
					padding: 15px 25px;
					border-radius: 15px;
					background-color: #17a34a;
					color: white !important;
					text-decoration: none;
					font-weight: bold;
					text-align: center;
				}

				.confirm-wrapper {
					text-align: center;
				}
			</style>
		</head>

		<body class="email-container">
			<h1>Emi Hair Club</h1>

			${CONTENT}

			<!-- FOOTER -->
			<div class="salon-info">
				<p>
					<strong>Emi Hair Club</strong>
					<br />
					${BARBER_SHOP_DETAILS.street ?? ""}<br />
					${BARBER_SHOP_DETAILS.phone ?? ""}
				</p>
				<div class="footer">
					<p>${new Date().getFullYear()} Emi Hair Club</p>
				</div>
			</div>
		</body>
	</html>
` as const;
