const nodemailer = require('nodemailer')

export const email = async (to, subject, html) => {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "mail.xiao.engineer",
        port: 25,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

// send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"Notifications" <no-reply@bonvivant.tech>', // sender address
        to: to,
        subject: subject,
        // text: "Hello world?", // plain text body
        html: html, // html body
    });

    console.log("Message sent: %s", info.messageId);
// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@xiao.engineer>
}
