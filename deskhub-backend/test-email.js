require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  try {
    console.log("📡 Connecting to SMTP server...");

    const transporter = nodemailer.createTransport({
      host: 'mail.mspsystem.com', // ⬅ hardcoded
      port: 587,
      secure: false,
      auth: {
        user: 'alert@mspsystem.com',
        pass: 'p@ssw0rd!101'
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"DeskHub Test" <alert@mspsystem.com>`,
      to: 'eman@mspsystem.com',
      subject: '✅ Test Email from DeskHub',
      text: 'This is a test email to confirm SMTP setup is working.'
    });

    console.log("✅ Test email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send test email:", error);
  }
})();
