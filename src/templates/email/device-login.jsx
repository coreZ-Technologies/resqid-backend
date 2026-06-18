// src/templates/email/device-login.jsx
import React from 'react';

export const DeviceLoginEmail = ({
  name,
  device,
  deviceType,
  browser,
  os,
  location,
  ipAddress,
  time,
  userAgent,
  isNewDevice,
  actionLink,
  supportEmail,
}) => {
  const deviceIcon = deviceType === 'mobile' ? '📱' : deviceType === 'tablet' ? '📱' : '💻';

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
        <h1 style={{ margin: 0, fontSize: '22px' }}>
          {isNewDevice ? '🔐 New Device Login' : '📱 Device Login'}
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        <p style={{ fontSize: '16px', color: '#1e293b' }}>
          Hello <strong>{name || 'User'}</strong>,
        </p>

        <p style={{ fontSize: '15px', color: '#1e293b' }}>
          {isNewDevice
            ? `A new device has logged into your RESQID account. If this wasn't you, please secure your account immediately.`
            : `Your account was accessed from the following device.`}
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
          <div style={{ textAlign: 'center', fontSize: '48px', marginBottom: '8px' }}>
            {deviceIcon}
          </div>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold', width: '35%' }}>Device:</td>
                <td style={{ padding: '6px 0' }}>{device || 'Unknown device'}</td>
              </tr>
              {browser && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Browser:</td>
                  <td style={{ padding: '6px 0' }}>{browser}</td>
                </tr>
              )}
              {os && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Operating System:</td>
                  <td style={{ padding: '6px 0' }}>{os}</td>
                </tr>
              )}
              {location && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Location:</td>
                  <td style={{ padding: '6px 0' }}>{location}</td>
                </tr>
              )}
              {ipAddress && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>IP Address:</td>
                  <td style={{ padding: '6px 0' }}>{ipAddress}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Time:</td>
                <td style={{ padding: '6px 0' }}>
                  {time ? new Date(time).toLocaleString('en-IN') : 'Just now'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {isNewDevice && (
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
              <strong>⚠️ If this was not you:</strong>
              <br />
              • Immediately change your password
              <br />
              • Contact your school administrator
              <br />
              • Contact support at{' '}
              <a href={`mailto:${supportEmail || 'support@resqid.app'}`} style={{ color: '#dc2626' }}>
                {supportEmail || 'support@resqid.app'}
              </a>
            </p>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={actionLink || 'https://resqid.app/security'}
            style={{
              display: 'inline-block',
              background: '#2563eb',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            {isNewDevice ? 'Secure Your Account' : 'View Account Activity'}
          </a>
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

export default DeviceLoginEmail;