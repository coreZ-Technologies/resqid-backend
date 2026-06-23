// src/templates/email/emergency-log.jsx
import React from 'react';

export const EmergencyLogEmail = ({
  studentName,
  studentId,
  studentClass,
  studentSection,
  schoolName,
  location,
  scannedAt,
  scannerName,
  scannerRole,
  alertType,
  dispatchResults,
  bloodGroup,
  allergies,
  conditions,
  medications,
  emergencyContacts,
  actionLink,
  supportEmail,
  schoolPhone,
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
        <h1 style={{ margin: 0, fontSize: '24px' }}>🚨 Emergency Alert Log</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
          This is a record of the emergency alert triggered for {studentName}
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        {/* Alert Summary */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            marginBottom: '16px',
          }}
        >
          <p style={{ margin: 0, fontSize: '15px', color: '#991b1b' }}>
            <strong>⚠️ Alert Type:</strong> {alertType || 'Emergency QR Scan'}
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>
            <strong>Triggered At:</strong>{' '}
            {scannedAt ? new Date(scannedAt).toLocaleString('en-IN') : 'Just now'}
          </p>
          {scannerName && (
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>
              <strong>Scanned By:</strong> {scannerName} {scannerRole ? `(${scannerRole})` : ''}
            </p>
          )}
          {location && (
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#7f1d1d' }}>
              <strong>Location:</strong> {location}
            </p>
          )}
        </div>

        {/* Student Information */}
        <h2 style={{ fontSize: '16px', color: '#1e293b', margin: '0 0 12px 0' }}>
          👤 Student Information
        </h2>
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
          }}
        >
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold', width: '35%' }}>Name:</td>
                <td style={{ padding: '4px 0' }}>{studentName}</td>
              </tr>
              {studentId && (
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Student ID:</td>
                  <td style={{ padding: '4px 0' }}>{studentId}</td>
                </tr>
              )}
              {studentClass && (
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Class:</td>
                  <td style={{ padding: '4px 0' }}>
                    {studentClass}{studentSection ? `-${studentSection}` : ''}
                  </td>
                </tr>
              )}
              {schoolName && (
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>School:</td>
                  <td style={{ padding: '4px 0' }}>{schoolName}</td>
                </tr>
              )}
              {schoolPhone && (
                <tr>
                  <td style={{ padding: '4px 0', fontWeight: 'bold' }}>School Phone:</td>
                  <td style={{ padding: '4px 0' }}>{schoolPhone}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Medical Information */}
        {(bloodGroup || allergies?.length || conditions?.length || medications?.length) && (
          <>
            <h2 style={{ fontSize: '16px', color: '#1e293b', margin: '0 0 12px 0' }}>
              🏥 Medical Information
            </h2>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            >
              <table style={{ width: '100%' }}>
                <tbody>
                  {bloodGroup && (
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 'bold', width: '35%' }}>
                        Blood Group:
                      </td>
                      <td style={{ padding: '4px 0' }}>{bloodGroup}</td>
                    </tr>
                  )}
                  {allergies?.length > 0 && (
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Allergies:</td>
                      <td style={{ padding: '4px 0' }}>{allergies.join(', ')}</td>
                    </tr>
                  )}
                  {conditions?.length > 0 && (
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Conditions:</td>
                      <td style={{ padding: '4px 0' }}>{conditions.join(', ')}</td>
                    </tr>
                  )}
                  {medications?.length > 0 && (
                    <tr>
                      <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Medications:</td>
                      <td style={{ padding: '4px 0' }}>{medications.join(', ')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Emergency Contacts */}
        {emergencyContacts?.length > 0 && (
          <>
            <h2 style={{ fontSize: '16px', color: '#1e293b', margin: '0 0 12px 0' }}>
              📞 Emergency Contacts
            </h2>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            >
              {emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  style={{
                    padding: '6px 0',
                    borderBottom: index < emergencyContacts.length - 1 ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{contact.name}</span>
                  {contact.relationship && (
                    <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '8px' }}>
                      ({contact.relationship})
                    </span>
                  )}
                  <div>
                    {contact.phone && (
                      <span style={{ fontSize: '13px', marginRight: '12px' }}>
                        📞 {contact.phone}
                      </span>
                    )}
                    {contact.email && (
                      <span style={{ fontSize: '13px' }}>✉️ {contact.email}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Dispatch Results */}
        {dispatchResults && (
          <>
            <h2 style={{ fontSize: '16px', color: '#1e293b', margin: '0 0 12px 0' }}>
              📨 Dispatch Results
            </h2>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #dcfce7',
                marginBottom: '16px',
              }}
            >
              <table style={{ width: '100%' }}>
                <tbody>
                  {Object.entries(dispatchResults).map(([channel, result]) => (
                    <tr key={channel}>
                      <td style={{ padding: '4px 0', fontWeight: 'bold', textTransform: 'capitalize', width: '35%' }}>
                        {channel}:
                      </td>
                      <td style={{ padding: '4px 0' }}>
                        {result?.success !== undefined
                          ? result.success
                            ? `✅ Sent (${result.sentCount || result.sent || 0})`
                            : `❌ Failed: ${result.error || 'Unknown error'}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={actionLink || 'https://resqid.app/emergency'}
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
            View Full Incident Log
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

export default EmergencyLogEmail;