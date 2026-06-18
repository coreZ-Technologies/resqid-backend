// src/templates/email/welcome-school.jsx
import React from 'react';

export const WelcomeSchoolEmail = ({
  schoolName,
  adminName,
  adminEmail,
  tempPassword,
  dashboardUrl,
  loginUrl,
  planName,
  planExpiry,
  cardCount,
  supportEmail,
  supportPhone,
  logoUrl,
  features = [],
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
        <h1 style={{ margin: 0, fontSize: '24px' }}>🏫 Welcome to RESQID!</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
          Your school's emergency response system is now active
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        {/* Greeting */}
        <p style={{ fontSize: '16px', color: '#1e293b' }}>
          Dear <strong>{adminName || 'School Administrator'}</strong>,
        </p>

        <p style={{ fontSize: '15px', color: '#1e293b' }}>
          Welcome to <strong>RESQID</strong> – the student emergency identification and safety platform.
          Your school <strong>{schoolName}</strong> has been successfully onboarded.
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
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
            📋 School Details
          </p>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold', width: '40%' }}>School:</td>
                <td style={{ padding: '4px 0' }}>{schoolName}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Administrator:</td>
                <td style={{ padding: '4px 0' }}>{adminName}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Email:</td>
                <td style={{ padding: '4px 0' }}>{adminEmail}</td>
              </tr>
              {planName && (
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Plan:</td>
                  <td style={{ padding: '4px 0' }}>{planName}</td>
                </tr>
              )}
              {planExpiry && (
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Valid Until:</td>
                  <td style={{ padding: '4px 0' }}>
                    {new Date(planExpiry).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              )}
              {cardCount !== undefined && (
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Card Count:</td>
                  <td style={{ padding: '4px 0' }}>{cardCount}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Login Credentials */}
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#fef9c3',
            borderRadius: '8px',
            border: '1px solid #fef08a',
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px', color: '#854d0e' }}>
            🔑 Your Login Credentials
          </p>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold', width: '40%' }}>Email:</td>
                <td style={{ padding: '4px 0' }}>{adminEmail}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Temporary Password:</td>
                <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#2563eb' }}>
                  {tempPassword || 'Check your separate password email'}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#854d0e' }}>
            ⚠️ For security, please change your password after your first login.
          </p>
        </div>

        {/* Features */}
        {(features.length > 0 || planName) && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #dcfce7',
            }}
          >
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#16a34a' }}>
              ✅ Features Included:
            </p>
            <ul
              style={{
                margin: '8px 0 0 0',
                paddingLeft: '20px',
                color: '#1e293b',
                fontSize: '14px',
                lineHeight: '1.8',
              }}
            >
              <li>🚨 Emergency QR Code System</li>
              <li>📱 Parent Notifications (Push + SMS + Email)</li>
              {features.includes('attendance') && <li>📊 Smart Attendance Tracking</li>}
              {features.includes('timetable') && <li>🗓️ Timetable Management</li>}
              {features.includes('communication') && <li>📨 Communication Tools</li>}
              <li>📈 Real-time Dashboard & Analytics</li>
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={loginUrl || 'https://resqid.app/login'}
            style={{
              display: 'inline-block',
              background: '#2563eb',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              marginRight: '8px',
            }}
          >
            Log In Now
          </a>
          <a
            href={dashboardUrl || 'https://resqid.app/dashboard'}
            style={{
              display: 'inline-block',
              background: '#1e293b',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            Go to Dashboard
          </a>
        </div>

        {/* Next Steps */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
            📌 Next Steps:
          </p>
          <ol
            style={{
              margin: '8px 0 0 0',
              paddingLeft: '20px',
              color: '#475569',
              fontSize: '14px',
              lineHeight: '1.8',
            }}
          >
            <li>Log in using the temporary password above</li>
            <li>Change your password immediately</li>
            <li>Add students and assign emergency contacts</li>
            <li>Download the RESQID App for mobile access</li>
            <li>Train staff on emergency QR scanning procedures</li>
          </ol>
        </div>

        {/* Contact Info */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {supportPhone && <span>📞 {supportPhone}</span>}
            {supportPhone && supportEmail && <span style={{ margin: '0 8px' }}>|</span>}
            {supportEmail && <span>✉️ {supportEmail}</span>}
          </p>
        </div>

        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '20px', textAlign: 'center' }}>
          This is an automated welcome email from RESQID. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
};

export default WelcomeSchoolEmail;