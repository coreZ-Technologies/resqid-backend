// src/templates/email/internal-alert.jsx
import React from 'react';

export const InternalAlertEmail = ({
  alertType,
  message,
  data,
  timestamp,
  source,
  severity,
  actionLink,
  supportEmail,
}) => {
  const severityColors = {
    LOW: { bg: '#f0fdf4', border: '#dcfce7', text: '#16a34a' },
    MEDIUM: { bg: '#fefce8', border: '#fef08a', text: '#ca8a04' },
    HIGH: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    CRITICAL: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  };

  const color = severityColors[severity?.toUpperCase()] || severityColors.MEDIUM;

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
          background: severity?.toUpperCase() === 'CRITICAL' || severity?.toUpperCase() === 'HIGH' 
            ? '#dc2626' 
            : severity?.toUpperCase() === 'MEDIUM' 
            ? '#ca8a04' 
            : '#2563eb',
          color: 'white',
          padding: '20px',
          borderRadius: '8px 8px 0 0',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '22px' }}>
          {severity?.toUpperCase() === 'CRITICAL' || severity?.toUpperCase() === 'HIGH' 
            ? '🚨' 
            : severity?.toUpperCase() === 'MEDIUM' 
            ? '⚠️' 
            : 'ℹ️'} {alertType || 'Internal Alert'}
        </h1>
        {severity && (
          <span
            style={{
              display: 'inline-block',
              marginTop: '6px',
              padding: '2px 12px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              fontSize: '12px',
            }}
          >
            Severity: {severity}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        <p style={{ fontSize: '16px', color: '#1e293b' }}>
          An internal system alert has been generated.
        </p>

        <div
          style={{
            padding: '16px',
            backgroundColor: color.bg,
            borderRadius: '8px',
            border: `1px solid ${color.border}`,
            marginTop: '12px',
          }}
        >
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold', width: '30%' }}>Alert Type:</td>
                <td style={{ padding: '6px 0' }}>{alertType || 'Unknown'}</td>
              </tr>
              {source && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Source:</td>
                  <td style={{ padding: '6px 0' }}>{source}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Timestamp:</td>
                <td style={{ padding: '6px 0' }}>
                  {timestamp ? new Date(timestamp).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Message */}
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <p style={{ margin: 0, fontSize: '15px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
            {message || 'No additional details provided.'}
          </p>
        </div>

        {/* Additional Data (JSON) */}
        {data && Object.keys(data).length > 0 && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#475569' }}>
                📊 Additional Data
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '300px',
                }}
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={actionLink || 'https://resqid.app/admin/alerts'}
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
            View in Dashboard
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
          This is an internal automated notification from RESQID. Please do not reply to this email.
        </p>
      </div>
    </div>
  );
};

export default InternalAlertEmail;