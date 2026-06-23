// src/templates/email/anomaly-detected.jsx
import React from 'react';

export const AnomalyDetectedEmail = ({
  studentName,
  studentId,
  anomalyType,
  location,
  detectedAt,
  schoolName,
  schoolLogo,
  description,
  actionLink,
}) => {
  // Human-readable labels for anomaly types
  const anomalyLabels = {
    SCAN_FREQUENCY: 'Unusual scan frequency',
    LOCATION_ANOMALY: 'Unusual scan location',
    TIME_ANOMALY: 'Unusual scan time',
    CARD_SHARING: 'Possible card sharing detected',
    MULTIPLE_DEVICES: 'Multiple devices detected',
    SUSPICIOUS_PATTERN: 'Suspicious scan pattern',
  };

  const typeLabel = anomalyLabels[anomalyType] || anomalyType || 'Unusual activity';

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#fff9f9',
        border: '1px solid #fecaca',
        borderRadius: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#dc2626',
          color: 'white',
          padding: '20px',
          borderRadius: '8px 8px 0 0',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px' }}>⚠️ Unusual Activity Detected</h1>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#fef2f2', borderRadius: '0 0 8px 8px' }}>
        <p style={{ fontSize: '16px', color: '#991b1b', marginTop: 0 }}>
          We detected unusual activity on <strong>{studentName}</strong>'s card.
        </p>

        <table style={{ width: '100%', marginTop: '16px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold', width: '40%' }}>Student:</td>
              <td style={{ padding: '8px 0' }}>{studentName}</td>
            </tr>
            {studentId && (
              <tr>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Student ID:</td>
                <td style={{ padding: '8px 0' }}>{studentId}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Anomaly Type:</td>
              <td style={{ padding: '8px 0', color: '#dc2626' }}>{typeLabel}</td>
            </tr>
            {location && (
              <tr>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Location:</td>
                <td style={{ padding: '8px 0' }}>{location}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Detected At:</td>
              <td style={{ padding: '8px 0' }}>
                {detectedAt ? new Date(detectedAt).toLocaleString('en-IN') : 'Just now'}
              </td>
            </tr>
            {schoolName && (
              <tr>
                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>School:</td>
                <td style={{ padding: '8px 0' }}>{schoolName}</td>
              </tr>
            )}
          </tbody>
        </table>

        {description && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #fecaca',
            }}
          >
            <p style={{ margin: 0, color: '#7f1d1d' }}>
              <strong>Details:</strong> {description}
            </p>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={actionLink || 'https://resqid.app/scan-anomalies'}
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
            View in RESQID App
          </a>
        </div>

        <p style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '20px', textAlign: 'center' }}>
          If you do not recognise this activity, please contact your school administrator immediately.
        </p>
      </div>
    </div>
  );
};

export default AnomalyDetectedEmail;