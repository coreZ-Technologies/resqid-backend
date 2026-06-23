// src/templates/email/card-locked.jsx
import React from 'react';

export const CardLockedEmail = ({
  parentName,
  studentName,
  studentId,
  cardId,
  schoolName,
  reason,
  lockedAt,
  actionLink,
  supportEmail,
}) => {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#fef9f9',
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
        <h1 style={{ margin: 0, fontSize: '22px' }}>🔒 Card Locked</h1>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        <p style={{ fontSize: '16px', color: '#1e293b' }}>
          Hello <strong>{parentName || 'Parent'}</strong>,
        </p>

        <p style={{ fontSize: '15px', color: '#1e293b' }}>
          The safety profile card for <strong>{studentName}</strong> has been locked.
        </p>

        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
          }}
        >
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold', width: '35%' }}>Student:</td>
                <td style={{ padding: '6px 0' }}>{studentName}</td>
              </tr>
              {studentId && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Student ID:</td>
                  <td style={{ padding: '6px 0' }}>{studentId}</td>
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
              {reason && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Reason:</td>
                  <td style={{ padding: '6px 0', color: '#dc2626' }}>{reason}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Locked At:</td>
                <td style={{ padding: '6px 0' }}>
                  {lockedAt ? new Date(lockedAt).toLocaleString('en-IN') : 'Just now'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
            <strong>ℹ️ What this means:</strong> The card is temporarily disabled and cannot be used for
            scanning until it is reactivated by the school administrator.
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
            View Card Status
          </a>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a
            href={`mailto:${supportEmail || 'support@resqid.app'}`}
            style={{ color: '#2563eb', textDecoration: 'none' }}
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

export default CardLockedEmail;