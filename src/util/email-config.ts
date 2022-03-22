import nodemailer from "nodemailer";
import { IUser } from "../models/user";
import { generateToken } from "./token-config";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const generateResetEmailHTML = (email: string, id: string, token: string) => {
    const htmlTemplate = `
        <h1>Hello There!</h1>
        <p>We recieved a request to reset the password for the Zomp account associated with ${email}.</p>
        <p>You can reset your password by clicking on the link below:</p>
        <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
            <td>
                <table cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="border-radius: 2px;" bgcolor="blue">
                            <a href="${process.env.ORIGIN}/reset-password/${id}/${token}" target="_blank" 
                                style="
                                    padding: 8px 12px; 
                                    border: 1px solid black;
                                    border-radius: 2px;
                                    color: white;
                                    text-decoration: none;
                                    font-weight:bold;
                                    display: inline-block;
                            ">
                                Reset Your Password            
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        </table>
        <p>Sincerely, <br>The Zomp Team</p>
    `;
    return htmlTemplate;
};

const generateResetEmailText = (email: string, id: string, token: string) => {
    const textTemplate = `
        Hello There!\n\n
        We recieved a request to reset the password for the Zomp account associated with ${email}.\n
        You can reset your password by clicking on the following link:\n\n
        ${process.env.CLIENT_ORIGIN}/reset-password/${id}/${token}\n\n
        Sincerely,\n
        The Zomp Team
    `;
    return textTemplate;
};

const generateVerifyEmailHTML = (id: string, token: string) => {
    const htmlTemplate = `
        <h1>Hello There!</h1>
        <p>Thank you for using Zomp!</p>
        <p>You can verify your email by clicking on the following link:</p>
        <table width="100%" cellspacing="0" cellpadding="0">
        <tr>
            <td>
                <table cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="border-radius: 2px;" bgcolor="blue">
                            <a href="${process.env.ORIGIN}/verify/${id}/${token}" target="_blank" 
                                style="
                                    padding: 8px 12px; 
                                    border: 1px solid black;
                                    border-radius: 2px;
                                    color: white;
                                    text-decoration: none;
                                    font-weight:bold;
                                    display: inline-block;
                            ">
                                Reset Your Password            
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        </table>
        <p>Sincerely, <br>The Zomp Team</p>
    `;
    return htmlTemplate;
};

const generateVerifyEmailText = (id: string, token: string) => {
    const textTemplate = `
        Hello There!\n\n
        Thank you for using Zomp!\n
        You can verify your email by clicking on the following link:\n\n
        ${process.env.ORIGIN}/reset-password/${id}/${token}\n\n
        Sincerely,\n
        The Zomp Team
    `;
    return textTemplate;
};

export const sendForgotPasswordEmail = async (user: IUser) => {
    // NOTE generated tokens expire in 1 hour
    const token = generateToken(user);

    const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to: user.email,
        subject: "Reset Your Zomp Password",
        text: generateResetEmailText(user.email, user._id, token),
        html: generateResetEmailHTML(user.email, user._id, token),
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return { error: "ERROR" };
        } else {
            console.log(`Email sent: ${info.response}`);
        }
    });

    return { msg: "OK" };
};

export const sendVerifyEmail = async (user: IUser) => {
    // NOTE generated tokens expire in 1 hour
    const token = generateToken(user);

    const mailOptions = {
        from: process.env.EMAIL_ADDRESS,
        to: user.email,
        subject: "Verify Your Zomp Account Email",
        text: generateVerifyEmailText(user._id, token),
        html: generateVerifyEmailHTML(user._id, token),
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return { error: "ERROR" };
        } else {
            console.log(`Email sent: ${info.response}`);
        }
    });

    return { msg: "OK" };
};
