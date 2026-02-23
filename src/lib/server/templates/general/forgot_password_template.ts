const emailTemplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <link rel="preload" as="image" href="{{site_logo_url}}" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body
    style="
      background-color: rgb(243, 244, 246);
      font-family:
        ui-sans-serif, system-ui, sans-serif, &quot;Apple Color Emoji&quot;,
        &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;
      padding-top: 40px;
      padding-bottom: 40px;
    "
  >
    <!--$-->
    <div
      style="
        display: none;
        overflow: hidden;
        line-height: 1px;
        opacity: 0;
        max-height: 0;
        max-width: 0;
      "
    >
      Reset your password for {{site_name}}
    </div>
    <table
      align="center"
      width="100%"
      border="0"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="
        background-color: rgb(255, 255, 255);
        border-radius: 8px;
        margin-left: auto;
        margin-right: auto;
        margin-top: 0px;
        margin-bottom: 0px;
        padding: 24px;
        max-width: 600px;
      "
    >
      <tbody>
        <tr style="width: 100%">
          <td>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="margin-top: 8px; margin-bottom: 32px; text-align: center"
            >
              <tbody>
                <tr>
                  <td>
                    <img
                      alt="{{site_name}}"
                      height="40"
                      src="{{site_logo_url}}"
                      style="
                        margin-left: auto;
                        margin-right: auto;
                        display: block;
                        outline: none;
                        border: none;
                        text-decoration: none;
                      "
                      width="120"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
            >
              <tbody>
                <tr>
                  <td>
                    <h1
                      style="
                        font-size: 24px;
                        font-weight: 700;
                        color: rgb(31, 41, 55);
                        margin-bottom: 16px;
                        text-align: center;
                      "
                    >
                      Reset Your Password
                    </h1>
                    <p
                      style="
                        font-size: 16px;
                        color: rgb(75, 85, 99);
                        margin-bottom: 24px;
                        line-height: 24px;
                        margin-top: 16px;
                      "
                    >
                      We received a request to reset your password for {{site_name}}. Click the button below to create a new password:
                    </p>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="
                        margin-bottom: 24px;
                        text-align: center;
                      "
                    >
                      <tbody>
                        <tr>
                          <td>
                            <a
                              href="{{reset_link}}"
                              style="
                                display: inline-block;
                                background-color: rgb(59, 130, 246);
                                color: rgb(255, 255, 255);
                                font-size: 16px;
                                font-weight: 600;
                                text-decoration: none;
                                text-align: center;
                                padding: 12px 32px;
                                border-radius: 8px;
                                line-height: 24px;
                              "
                              target="_blank"
                            >
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p
                      style="
                        font-size: 14px;
                        color: rgb(107, 114, 128);
                        margin-bottom: 16px;
                        line-height: 20px;
                        margin-top: 16px;
                        text-align: center;
                      "
                    >
                      Or copy and paste this URL into your browser:
                    </p>
                    <p
                      style="
                        font-size: 14px;
                        color: rgb(59, 130, 246);
                        margin-bottom: 24px;
                        line-height: 20px;
                        word-break: break-all;
                        text-align: center;
                      "
                    >
                      {{reset_link}}
                    </p>
                    <p
                      style="
                        font-size: 16px;
                        color: rgb(75, 85, 99);
                        margin-bottom: 24px;
                        line-height: 24px;
                        margin-top: 16px;
                      "
                    >
                      This link will expire in 5 minutes. If you didn&#x27;t request a password reset, you
                      can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--7--><!--/$-->
  </body>
</html>`;

export default {
  template_id: "forgot_password",
  template_subject: "{{site_name}} - Reset Your Password",
  template_html_body: emailTemplate,
  template_text_body: `Reset your password for {{site_name}}\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{reset_link}}\n\nThis link will expire in 5 minutes. If you didn't request a password reset, you can safely ignore this email.`,
};
