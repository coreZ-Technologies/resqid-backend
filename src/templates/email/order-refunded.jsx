// src/templates/email/order-refunded.jsx
import React from 'react';

export const OrderRefundedEmail = ({
  schoolName,
  orderNumber,
  orderDate,
  studentName,
  studentId,
  studentClass,
  studentSection,
  refundAmount,
  refundReason,
  refundMethod,
  refundDate,
  transactionId,
  cardCount,
  actionLink,
  supportEmail,
  schoolPhone,
  logoUrl,
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
          background: '#16a34a',
          color: 'white',
          padding: '20px',
          borderRadius: '8px 8px 0 0',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '22px' }}>🔄 Order Refunded</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
          Your order has been refunded successfully
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' }}>
        {/* Greeting */}
        <p style={{ fontSize: '16px', color: '#1e293b' }}>
          Hello <strong>{schoolName || 'School'}</strong>,
        </p>

        <p style={{ fontSize: '15px', color: '#1e293b' }}>
          We have processed a refund for your order <strong>#{orderNumber}</strong>.
          The refund has been successfully initiated.
        </p>

        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #dcfce7',
          }}
        >
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 'bold', width: '40%' }}>Order Number:</td>
                <td style={{ padding: '6px 0' }}>#{orderNumber}</td>
              </tr>
              {orderDate && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Order Date:</td>
                  <td style={{ padding: '6px 0' }}>
                    {new Date(orderDate).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              )}
              {refundDate && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Refund Date:</td>
                  <td style={{ padding: '6px 0' }}>
                    {new Date(refundDate).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              )}
              {cardCount && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Card Count:</td>
                  <td style={{ padding: '6px 0' }}>{cardCount}</td>
                </tr>
              )}
              {refundAmount && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Refund Amount:</td>
                  <td style={{ padding: '6px 0', color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>
                    ₹{refundAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              {refundReason && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Refund Reason:</td>
                  <td style={{ padding: '6px 0' }}>{refundReason}</td>
                </tr>
              )}
              {refundMethod && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Refund Method:</td>
                  <td style={{ padding: '6px 0', textTransform: 'capitalize' }}>{refundMethod}</td>
                </tr>
              )}
              {transactionId && (
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Transaction ID:</td>
                  <td style={{ padding: '6px 0' }}>{transactionId}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Student Information (if applicable) */}
        {studentName && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
              <strong>Student Details:</strong>
            </p>
            <table style={{ width: '100%', marginTop: '4px' }}>
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
              </tbody>
            </table>
          </div>
        )}

        {/* Refund Timeline */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fef9c3',
            borderRadius: '6px',
            border: '1px solid #fef08a',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#854d0e' }}>
            <strong>ℹ️ Refund Processing:</strong>
            {refundMethod === 'credit_card' && ' Refunds to credit cards typically take 5-10 business days to reflect.'}
            {refundMethod === 'upi' && ' UPI refunds usually reflect within 24-48 hours.'}
            {refundMethod === 'net_banking' && ' Net banking refunds typically take 3-5 business days.'}
            {!refundMethod && ' Please allow 5-10 business days for the refund to reflect in your account.'}
          </p>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a
            href={actionLink || 'https://resqid.app/orders'}
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
            View Order Status
          </a>
        </div>

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
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

export default OrderRefundedEmail;