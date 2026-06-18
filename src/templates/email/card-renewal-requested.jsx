// src/templates/email/card-renewal-requested.jsx
import React from 'react';

export const CardRenewalRequestedEmail = ({
  parentName,
  parentPhone,
  parentEmail,
  studentName,
  studentId,
  studentClass,
  studentSection,
  cardId,
  schoolName,
  renewalReason,
  requestedAt,
  currentExpiry,
  newExpiry,
  actionLink,
  adminActionLink,
  supportEmail,
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
        <h1 style={{ margin: 0, fontSize: '22px' }}>🔄 Card Renewal Requested</h1>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        <p style={{ fontSize: '16px', color: '#1e293b' }}>
          Hello <strong>{parentName || 'Parent'}</strong>,
        </p>

        <p style={{ fontSize: '15px', color: '#1e293b' }}>
          Your request to renew the card for <strong>{studentName}</strong> has been submitted.
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
                <td style={{ padding: '6px 0', fontWeight: 'bold', width: '40%' }}>Student:</td>
                <td style={{ padding: '6px 0' }}>{studentName}</td>
              </tr>
              {studentId && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Student ID:</td>
                  <td style={{ padding: '6px 0' }}>{studentId}</td>
                </tr>
              )}
              {studentClass && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Class:</td>
                  <td style={{ padding: '6px 0' }}>
                    {studentClass}{studentSection ? `-${studentSection}` : ''}
                  </td>
                </tr>
              )}
              {cardId && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Card ID:</td>
                  <td style={{ padding: '6px 0' }}>{cardId}</td>
                </tr>
              )}
              {schoolName && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>School:</td>
                  <td style={{ padding: '6px 0' }}>{schoolName}</td>
                </tr>
              )}
              {currentExpiry && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Current Expiry:</td>
                  <td style={{ padding: '6px 0', color: '#dc2626' }}>
                    {new Date(currentExpiry).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              )}
              {newExpiry && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>New Expiry:</td>
                  <td style={{ padding: '6px 0', color: '#16a34a' }}>
                    {new Date(newExpiry).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              )}
              {renewalReason && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Reason:</td>
                  <td style={{ padding: '6px 0' }}>{renewalReason}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Requested At:</td>
                <td style={{ padding: '6px 0' }}>
                  {requestedAt ? new Date(requestedAt).toLocaleString('en-IN') : 'Just now'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Parent Contact Info */}
        {(parentPhone || parentEmail) && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
              <strong>Contact:</strong>
              {parentPhone && <span style={{ marginLeft: '8px' }}>📞 {parentPhone}</span>}
              {parentEmail && <span style={{ marginLeft: '12px' }}>✉️ {parentEmail}</span>}
            </p>
          </div>
        )}

        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fef9c3', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#854d0e' }}>
            <strong>⏳ Awaiting Approval:</strong> Your request is pending review by the school administrator.
            You will be notified once it is approved.
          </p>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={actionLink || 'https://resqid.app/cards'}
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
            Track Request Status
          </a>
        </div>

        {adminActionLink && (
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <a
              href={adminActionLink}
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}
            >
              Review Request (Admin)
            </a>
          </div>
        )}

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

export default CardRenewalRequestedEmail;