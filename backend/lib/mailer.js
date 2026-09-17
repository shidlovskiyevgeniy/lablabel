const nodemailer = require("nodemailer");

// Generic SMTP relay — works with Yandex 360 for Business mail, or any
// transactional email provider (Mailgun, Postmark, etc). Configure via env vars.
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  return getTransporter().sendMail({ from, to, subject, text, html });
}

async function sendAuthCode(email, code) {
  return sendMail({
    to: email,
    subject: `Код для входа: ${code}`,
    text: `Ваш код для входа в личный кабинет lablabel.ru: ${code}\nКод действует 10 минут.`,
  });
}

async function sendOrderPaidNotice({ toBuyer, toSeller, order }) {
  const summary = `Заказ #${order.id.slice(0, 8)} на сумму ${order.total} ₽ оплачен.`;
  await sendMail({ to: toBuyer, subject: "Оплата получена — lablabel.ru", text: summary });
  if (toSeller) {
    await sendMail({ to: toSeller, subject: `Новый оплаченный заказ #${order.id.slice(0, 8)}`, text: summary });
  }
}

module.exports = { sendMail, sendAuthCode, sendOrderPaidNotice };
