import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, logError, logWarn } = vi.hoisted(() => ({
  send: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

vi.mock("./logger", () => ({
  logger: { error: logError, warn: logWarn },
}));

import { EmailService } from "./mailer";

describe("EmailService", () => {
  beforeEach(() => {
    send.mockResolvedValue({ data: { id: "email-id" } });
  });

  it("escapes every reservation value in HTML and includes a plain-text alternative", async () => {
    await new EmailService().newReservation({
      name: '<script>alert("name")</script>',
      date: "1 < 2",
      hour: '10:00 & "later"',
      staffName: "O'Reilly > Staff",
      serviceNames: ["Cut & Style", "<b>Color</b>"],
      link: "https://example.com/confirm?one=1&two=2",
      to: "person@example.com",
    });

    const payload = send.mock.calls[0][0];
    expect(payload.html).not.toContain("<script>");
    expect(payload.html).not.toContain("<b>Color</b>");
    expect(payload.html).toContain("&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;");
    expect(payload.html).toContain("1 &lt; 2");
    expect(payload.html).toContain("10:00 &amp; &quot;later&quot;");
    expect(payload.html).toContain("O&#39;Reilly &gt; Staff");
    expect(payload.html).toContain("Cut &amp; Style, &lt;b&gt;Color&lt;/b&gt;");
    expect(payload.html).toContain('href="https://example.com/confirm?one=1&amp;two=2"');
    expect(payload.text).toContain("Conferma prenotazione");
    expect(payload.text).toContain("https://example.com/confirm?one=1&two=2");
  });

  it.each(["javascript:alert(1)", "mailto:user@example.com", "/relative", "not a url"])(
    "refuses the unsafe or unexpected link %s",
    async (link) => {
      const result = await new EmailService().verifyEmail({
        name: "User",
        link,
        to: "person@example.com",
      });

      expect(result.kind).toBe("err");
      expect(send).not.toHaveBeenCalled();
      expect(logWarn).toHaveBeenCalledWith(
        { subject: "Verifica email" },
        "Refused to send email with invalid link",
      );
    },
  );

  it("does not log the full recipient when Resend fails", async () => {
    send.mockRejectedValueOnce(new Error("failure"));

    await new EmailService().changeEmail({
      name: "User",
      link: "https://example.com/change",
      to: "private.person@example.com",
    });

    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ recipientDomain: "example.com", subject: "Cambio mail" }),
      "Could not send email",
    );
    expect(JSON.stringify(logError.mock.calls)).not.toContain("private.person@example.com");
  });
});
