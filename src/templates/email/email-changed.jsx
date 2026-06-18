// src/templates/email/email-changed.jsx
import React from 'react';

export const EmailChangedEmail = ({
  name,
  oldEmail,
  newEmail,
  changedAt,
  ipAddress,
  location,
  device,
  actionLink,
  supportEmail,
  securityLink,
}) => {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#2563eb',
          color: 'white',
          padding: '20px',
          borderRadius: '8px 8px 0 0',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '22px' }}>✉️ Email Address Changed</h1>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        <p style={{ fontSize: '16px', color: '#1e293b' }}>
          Hello <strong>{name || 'User'}</strong>,
        </p>

        <p style={{ fontSize: '15px', color: '#1e293b' }}>
          The email address associated with your RESQID account has been changed.
        </p>

        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
          }}
        >
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold', width: '35%' }}>Previous Email:</td>
                <td style={{ padding: '6px 0', color: '#dc2626' }}>{oldEmail}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold' }}>New Email:</td>
                <td style={{ padding: '6px 0', color: '#16a34a' }}>{newEmail}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Changed At:</td>
                <td style={{ padding: '6px 0' }}>
                  {changedAt ? new Date(changedAt).toLocaleString('en-IN') : 'Just now'}
                </td>
              </tr>
              {ipAddress && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>IP Address:</td>
                  <td style={{ padding: '6px 0' }}>{ipAddress}</td>
                </tr>
              )}
              {location && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Location:</td>
                  <td style={{ padding: '6px 0' }}>{location}</td>
                </tr>
              )}
              {device && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Device:</td>
                  <td style={{ padding: '6px 0' }}>{device}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            borderRadius: '6px',
            border: '1px solid #fecaca',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
            <strong>⚠️ If you did not make this change:</strong>
            <br />
            • Immediately secure your account
            <br />
            • Contact your school administrator
            <br />
            • Contact support at{' '}
            <a href={`mailto:${supportEmail || 'support@resqid.app'}`} style={{ color: '#dc2626' }}>
              {supportEmail || 'support@resqid.app'}
            </a>
          </p>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={securityLink || 'https://resqid.app/security'}
            style={{
              display: 'inline-block',
              background: '#dc2626',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            Secure Your Account
          </a>
          {actionLink && (
            <a
              href={actionLink}
              style={{
                display: 'inline-block',
                marginLeft: '12px',
                background: '#2563eb',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              Go to Profile
            </a>
          )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a
            href={`mailto:${supportEmail || 'support@resqid.app'}`}
            style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}
          >
            Contact Support
          </a>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '20px', textAlign: 'center' }}>
          This is an automated notification from RESQID. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
};

export default EmailChangedEmail;