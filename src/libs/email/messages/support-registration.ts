export const buildSuccessfulRegistrationHtml = (
     clientEmail: string,
     contactPerson: string
): string => `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f2f2f2; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { background-color: #f2f2f2; padding: 20px; text-align: center; }
  </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>Client Registered Successfully</h1>
      </div>
      <div class="content">
        <p>Client Name: ${contactPerson}</p>
        <p>Client Email: ${clientEmail}</p>
      </div>
      <div class="footer">
        <p>Client Registered Successfully</p>
      </div>
    </div>
  </body>
  </html>
`;

export const buildClientContactMessageHtml = (
     clientEmail: string,
     contactPerson: string,
     message: string
): string => `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f2f2f2; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { background-color: #f2f2f2; padding: 20px; text-align: center; }
  </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>Client Contact Message</h1>
      </div>
      <div class="content">
        <p>Client Name: ${contactPerson}</p>
        <p>Client Email: ${clientEmail}</p>
        <p>Message: ${message}</p>
      </div>
    </div>
  </body>
  </html>
`;
