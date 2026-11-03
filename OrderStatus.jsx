import React, { useEffect, useState } from 'react';
import './OrderStatus.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';

const STATUS_LABELS = {
  PENDING: 'Order received',
  PAYMENT_PROCESSING: 'Payment processing',
  PAID: 'Confirmed',
  PROCESSING: 'Preparing your order',
  SHIPPED: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const STEPS = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default function OrderStatus({ token }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${token}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Order not found');
        }
        if (!cancelled) setOrder(data.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="order-status-page">
        <p className="order-status-loading">Loading your order…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-status-page">
        <div className="order-status-card">
          <h1>Order not found</h1>
          <p>
            We couldn't find this order. The link may be invalid or expired.
            If you need help, email{' '}
            <a href="mailto:jewelrylani060@gmail.com">jewelrylani060@gmail.com</a>.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(order.status);
  const cancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className="order-status-page">
      <div className="order-status-card">
        <div className="order-status-brand">LANI</div>

        <h1 className="order-status-title">
          Order #{String(order.id).slice(0, 8)}
        </h1>
        <p className="order-status-sub">
          Placed on{' '}
          {new Date(order.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>

        <div className={`order-status-pill order-status-pill--${order.status?.toLowerCase()}`}>
          {STATUS_LABELS[order.status] || order.status}
        </div>

        {!cancelled && (
          <div className="order-status-steps">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className={`order-status-step ${
                  i <= currentIndex ? 'is-done' : ''
                } ${i === currentIndex ? 'is-current' : ''}`}
              >
                <div className="order-status-step-dot" />
                <div className="order-status-step-label">
                  {STATUS_LABELS[step]}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="order-status-section">
          <h2>Items</h2>
          <ul className="order-status-items">
            {(order.items || []).map((item, idx) => (
              <li key={idx}>
                <span>
                  {item.product_name} × {item.quantity}
                </span>
                <span>Rs. {item.total_price}</span>
              </li>
            ))}
          </ul>
          <div className="order-status-total">
            <span>Total</span>
            <strong>Rs. {order.total}</strong>
          </div>
        </div>

        <div className="order-status-section">
          <h2>Shipping to</h2>
          <p className="order-status-address">
            {order.customer_name}
            <br />
            {order.shipping_address}
            <br />
            {[order.shipping_city, order.shipping_postal_code]
              .filter(Boolean)
              .join(', ')}
            <br />
            {order.shipping_country}
            <br />
            {order.shipping_phone}
          </p>
        </div>

        {order.shipment?.tracking_number && (
          <div className="order-status-section">
            <h2>Tracking</h2>
            <p className="order-status-address">
              <strong>{order.shipment.courier_name || 'Courier'}</strong>
              <br />
              <span className="order-status-mono">
                {order.shipment.tracking_number}
              </span>
            </p>
          </div>
        )}

        <p className="order-status-footer">
          Questions? Email{' '}
          <a href="mailto:jewelrylani060@gmail.com">
            jewelrylani060@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
