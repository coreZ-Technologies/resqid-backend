// src/modules/share/notification/notification.templates.js
// Template engine using simple string replacement or Handlebars
export class NotificationTemplates {
  static render(templateStr, data) {
    let output = templateStr;
    for (const [key, value] of Object.entries(data)) {
      output = output.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return output;
  }

  static getWelcomeEmail(data) {
    return {
      subject: `Welcome to ResQID, ${data.name}!`,
      html: `<h1>Hello ${data.name}</h1><p>Thank you for joining ResQID.</p>`,
    };
  }

  static getEmergencyAlert(data) {
    return {
      title: `🚨 Emergency Alert: ${data.type}`,
      body: `${data.message} at ${data.location}. Please take necessary action.`,
    };
  }

  // Add more templates as needed
}