// @ts-nocheck
import { Resend } from "resend";
import nodemailer from "nodemailer";
import getSMTPTransport from "./smtps.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import {
  GetGlobalSubscribers,
  GetSMTPFromENV,
  GetSubscriberByIncidentID,
  GetSubscribers,
} from "../controllers/controller.js";
class EmailingSub {
  to = "";
  from;
  siteData;
  subscribers = [];
  meta = {
    from: "",
    smtp_host: "",
    smtp_port: "",
    smtp_secure: "",
    smtp_user: "",
    smtp_pass: "",
  };
  constructor(siteData) {
    this.siteData = siteData;
  }

  transformData(data, token) {
    let formattedTime = new Date(data.timestamp * 1000).toISOString();
    let smtp = GetSMTPFromENV();
    this.meta = {
      from: smtp.smtp_from_email,
      smtp_host: smtp.smtp_host,
      smtp_port: smtp.smtp_port,
      smtp_user: smtp.smtp_user,
      smtp_pass: smtp.smtp_pass,
      smtp_secure: smtp.smtp_secure,
    };
    let emailApiRequest = {
      from: this.meta.from,
      subject: `[${data.status}] ${data.incident_name}  at ${formattedTime}`,
      text: `Incident Update: ${data.incident_name} — STATUS: ${data.status} (as of ${formattedTime}).`,
      html: "",
    };

    let bgColor = "#f4f4f4";
    if (data.status === "INVESTIGATING") {
      bgColor = "#fe588a";
    } else if (data.status === "MONITORING") {
      bgColor = "#ffaf4d";
    } else if (data.status === "IDENTIFIED") {
      bgColor = "#b987f7";
    } else if (data.status === "RESOLVED") {
      bgColor = "#7aba78";
    }
    if (data.incident_type == "MAINTENANCE") {
      data.status = "MAINTENANCE UPDATE";
      bgColor = "#505050";
    }
    let html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Alert Notification</title>
			<style>
				body {
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
					line-height: 1.6;
					margin: 0;
					padding: 0;
					background-color: #f4f4f4;
					color: #333;
				}
				.container {
					max-width: 600px;
					margin: 20px auto;
					padding: 20px;
					background: #ffffff;
					border-radius: 8px;
					box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				}
				.header {
					text-align: center;
					padding-bottom: 20px;
					border-bottom: 1px solid #eee;
				}
				.alert-badge {
					display: inline-block;
					padding: 6px 12px;
					border-radius: 16px;
					background-color: ${bgColor};
					color: white;
					font-weight: 500;
					font-size: 14px;
					margin-bottom: 16px;
				}
				.alert-title {
					font-size: 24px;
					font-weight: 600;
					margin: 0;
					color: #2c3e50;
				}
				.alert-type {
					font-size: 20px;
					font-weight: 600;
					margin: 0;
					color: #2c3e50;
				}
				.metric-box {
					background: #f8f9fa;
					border-radius: 6px;
					padding: 16px;
					margin: 16px 0;
				}
				.button {
					display: inline-block;
					padding: 12px 24px;
					background-color: #007bff;
					color: white !important; /* Ensures text stays white */
					text-decoration: none;
					border-radius: 6px;
					font-weight: 500;
					margin-top: 20px;
				}	
				.button:visited,
				.button:hover,
				.button:active {
					color: white !important; /* Ensures no color change */
				}
				.footer {
					text-align: center;
					padding-top: 20px;
					color: #666;
					font-size: 14px;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<table width="100%" border="0" cellspacing="0" cellpadding="0">
					<tr>
						<td>
							<a href="${this.siteData.siteURL}" style="text-decoration: none;">
								<span style="font-size: 24px; font-weight: 600; color: #2c3e50;">${this.siteData.siteName}</span>
							</a>
						</td>
					</tr>
				</table>

				<div class="header" style="margin-top:20px">
					
					<h1 class="alert-type" style="margin:2px">${data.incident_type}</h1>
                  	<h1 class="alert-title">
                      ${data.incident_name}
                  </h1>
				  <div class="alert-badge">${data.status}</div>
				</div>
				
				<table width="100%" border="0" cellspacing="0" cellpadding="8">
					<tr style="border-bottom: 1px solid #eee;">
						<td width="40%" style="color: #666; font-weight: 500;">Status</td>
						<td width="60%" style="text-align: right;">${data.status}</td>
					</tr>
					<tr style="border-bottom: 1px solid #eee;">
						<td width="40%" style="color: #666; font-weight: 500;">Time</td>
						<td width="60%" style="text-align: right;">${formattedTime}</td>
					</tr>
				</table>
				
				<p style="margin: 2px 0;">New Event Update: ${data.description}</p>
              <div style="text-align: center">
                				 <a href="${this.siteData.siteURL}" class="button" > View Status Page</a>
              </div>
				<div class="footer">
					This is an  incident notification from ${this.siteData.siteName} monitoring system.
                  <a href="${this.siteData.siteURL}/?token=${token}">Unsubscribe</a>
				</div>
			</div>
		</body>
		</html> 
		`;

    emailApiRequest.html = html;

    return emailApiRequest;
  }

  type() {
    return "email";
  }

  async send(data) {
    // Configure the SMTP transporter using the stored SMTP details

    try {
      // Fetch all subscribers for the given incidentID
      let subscribers = await GetSubscriberByIncidentID(data);
      let globalSubscribers = await GetGlobalSubscribers();

      // Combine local and global subscribers
      let subscriberList = [...subscribers, ...globalSubscribers].map((sub) => ({
        email: sub.email,
        token: sub.token,
      }));
      if (!subscriberList || subscriberList.length === 0) {
        throw new Error("No subscribers found for this incident.");
      }
      // Loop through each subscriber and send an email individually
      for (let i = 0; i < subscriberList.length; i++) {
        const subscriberEmail = subscriberList[i].email;
        const emailBody = this.transformData(data, subscriberList[i].token); // Generate email body for each subscriber
        const transporter = getSMTPTransport(this.meta);

        // Prepare email options for each subscriber
        const mailOptions = {
          from: emailBody.from, // Sender address
          to: subscriberEmail, // Send email to one subscriber
          subject: emailBody.subject, // Email subject
          text: emailBody.text, // Plain text body
          html: emailBody.html, // HTML body
        };

        try {
          // Send email to individual subscriber
          let result = await transporter.sendMail(mailOptions);
          console.log(`Email sent successfully to ${subscriberEmail}:`, result);
        } catch (error) {
          console.error(`Error sending email to ${subscriberEmail}: ${error.message}`);
          throw error;
        }
      }

      return { message: "Emails sent individually", success: true };
    } catch (error) {
      console.error("Error sending email via SMTP: " + error.message);
      throw error;
    }
  }
}
export default EmailingSub;
