import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './CheckoutModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';

// List of all 77 districts
const DISTRICTS = [
  "Taplejung", "Panchthar", "Ilam", "Jhapa", "Morang", "Sunsari", "Dhankuta", 
  "Terhathum", "Sankhuwasabha", "Bhojpur", "Solukhumbu", "Okhaldhunga", "Khotang", 
  "Udayapur", "Saptari", "Siraha", "Dhanusha", "Mahottari", "Sarlahi", "Rautahat", 
  "Bara", "Parsa", "Kathmandu", "Lalitpur", "Bhaktapur", "Kavrepalanchok", 
  "Sindhupalchok", "Nuwakot", "Rasuwa", "Dhading", "Makwanpur", "Chitwan", 
  "Ramechhap", "Dolakha", "Sindhuli", "Gorkha", "Lamjung", "Tanahun", "Kaski", 
  "Manang", "Mustang", "Myagdi", "Parbat", "Baglung", "Syangja", "Nawalpur", 
  "Rupandehi", "Kapilvastu", "Palpa", "Arghakhanchi", "Gulmi", "Pyuthan", 
  "Rolpa", "Dang", "Banke", "Bardiya", "Parasi", "Rukum East", "Dolpa", 
  "Mugu", "Humla", "Jumla", "Kalikot", "Dailekh", "Jajarkot", "Surkhet", 
  "Salyan", "Rukum West", "Bajura", "Bajhang", "Darchula", "Baitadi", 
  "Dadeldhura", "Doti", "Achham", "Kailali", "Kanchanpur"
];

export default function CheckoutModal({ cart, total: cartTotal, onClose, onSuccess }) {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    shipping_district: '', // New field
    shipping_country: 'Nepal',
  });
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  // Shipping fee calculation based strictly on the district dropdown
  const isValley = ['Kathmandu', 'Lalitpur', 'Bhaktapur'].includes(form.shipping_district);
  const shippingFee = isValley ? 0 : 100;
  const finalTotal = cartTotal + shippingFee;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/fonepay/banks`);
        const data = await res.json();
        const list = data?.data?.banks || data?.data?.bankDetails || data?.banks || data?.bankDetails || [];
        if (!cancelled) setBanks(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('Bank list fetch failed:', err);
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitForm = (e) => {
    e.preventDefault();
    setError(null);

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(form.customer_phone.trim())) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    if (!form.shipping_address.trim()) {
      setError('Please enter your street address.');
      return;
    }

    if (!form.shipping_district) {
      setError('Please select your district from the list.');
      return;
    }

    if (!DISTRICTS.includes(form.shipping_district)) {
      setError('Invalid district. Please select from the dropdown list.');
      return;
    }

    if (!form.customer_name.trim() || !form.customer_email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setStep('bank');
  };

  const payNow = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/checkout/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cart.map((i) => ({
            product_id: i.id,
            product_variant_id: i.variant_id || i.product_variant_id || null,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not start payment');
      }
      setOrder(data.data);
      setStep('qr');
      startPolling(data.data.orderId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startPolling = (orderId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/checkout/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        const s = data?.data?.status;
        if (s === 'paid') {
          clearInterval(pollRef.current);
          setStep('paid');
          onSuccess?.();
        } else if (s === 'failed') {
          clearInterval(pollRef.current);
          setStep('failed');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 5000);
  };

  const iconUrl = (icon) => {
    if (!icon) return null;
    if (/^https?:\/\//i.test(icon)) return icon;
    return `https://uat-new-merchant-api.fonepay.com/${icon}`;
  };

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <button className="checkout-close" onClick={onClose}>×</button>

        <div className="checkout-content">
          {step === 'form' && (
            <>
              <h2>Checkout</h2>
              <p className="checkout-sub">Enter delivery details</p>
              {error && <div className="checkout-error">{error}</div>}
              
              <form onSubmit={submitForm} className="checkout-form">
                <label>
                  Full name
                  <input name="customer_name" value={form.customer_name} onChange={handleChange} required />
                </label>
                
                <label>
                  Email
                  <input type="email" name="customer_email" value={form.customer_email} onChange={handleChange} required />
                </label>
                
                <label>
                  Phone (10 digits)
                  <input type="tel" name="customer_phone" value={form.customer_phone} onChange={handleChange} maxLength="10" placeholder="e.g. 9800000000" required />
                </label>
                
                <label>
                  Street Address / Landmark
                  <input 
                    name="shipping_address" 
                    value={form.shipping_address} 
                    onChange={handleChange} 
                    placeholder="e.g., Thamel, Near Himalayan Java" 
                    required
                  />
                </label>

                <label>
                  District
                  <input 
                    list="nepal-districts" 
                    name="shipping_district" 
                    value={form.shipping_district} 
                    onChange={handleChange} 
                    placeholder="Search and select district..." 
                    required 
                  />
                  <datalist id="nepal-districts">
                    {DISTRICTS.map((district) => (
                      <option key={district} value={district} />
                    ))}
                  </datalist>
                  <span className="checkout-hint">
                    Free delivery is only inside Kathmandu, Lalitpur, and Bhaktapur.
                  </span>
                </label>

                <div className="checkout-summary-box">
                  <div className="summary-line">
                    <span>Subtotal</span>
                    <span>Rs. {cartTotal}</span>
                  </div>
                  <div className="summary-line">
                    <span>Shipping {isValley ? '(Inside Valley)' : '(Outside Valley)'}</span>
                    <span>{shippingFee === 0 ? 'Free' : `Rs. ${shippingFee}`}</span>
                  </div>
                  <div className="summary-line total-line">
                    <span>Total</span>
                    <strong>Rs. {finalTotal}</strong>
                  </div>
                </div>

                <button className="checkout-submit" type="submit">Continue</button>
              </form>
            </>
          )}

          {step === 'bank' && (
            <>
              <h2>Select your bank</h2>
              <p className="checkout-sub">Choose the app you'll use to pay · Rs. {finalTotal}</p>
              {error && <div className="checkout-error">{error}</div>}
              
              {banksLoading ? (
                <p className="checkout-pending"><span className="pulse" /> Loading banks…</p>
              ) : banks.length === 0 ? (
                <p className="checkout-sub" style={{ opacity: 0.7 }}>No banks available right now.</p>
              ) : (
                <div className="bank-grid">
                  {banks.map((b) => (
                    <button key={b.bankCode} type="button" className={`bank-tile ${selectedBank?.bankCode === b.bankCode ? 'selected' : ''}`} onClick={() => setSelectedBank(b)}>
                      {iconUrl(b.bankIcon) ? <img src={iconUrl(b.bankIcon)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <div className="bank-tile-placeholder">{b.bankName?.[0] || '?'}</div>}
                      <span>{b.bankName}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="checkout-actions-row">
                <button className="checkout-submit" onClick={payNow} disabled={busy}>{busy ? 'Starting…' : 'Pay Now'}</button>
                <button className="checkout-submit checkout-submit--ghost" onClick={() => setStep('form')} disabled={busy}>Back</button>
              </div>
            </>
          )}

          {step === 'qr' && order && (
            <>
              <h2>Scan to pay</h2>
              <p className="checkout-sub">Open the Fonepay app · Rs. {order.amount}</p>
              <div className="checkout-qr">
                {order.qrString ? <QRCodeSVG value={order.qrString} size={240} /> : <p className="checkout-error">Fonepay did not return a QR string.</p>}
              </div>
              
              {selectedBank && <p className="checkout-ref" style={{ marginBottom: 8 }}>Selected bank: <strong>{selectedBank.bankName}</strong></p>}
              
              <p className="checkout-pending"><span className="pulse" /> Waiting for payment…</p>
              
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#77786f', marginTop: '20px', lineHeight: '1.6' }}>
                After a successful transaction, a confirmation email and receipt will be sent to your email address.
              </p>
            </>
          )}

          {step === 'paid' && (
            <div className="checkout-status">
              <div className="checkout-status-mark">✓</div>
              <h2>Payment received</h2>
              <p className="checkout-sub">Thank you! Your order is confirmed.</p>
              <button className="checkout-submit" onClick={onClose}>Close</button>
            </div>
          )}

          {step === 'failed' && (
            <div className="checkout-status">
              <div className="checkout-status-mark" style={{ borderColor: '#f4cccc', color: '#b91c1c' }}>✕</div>
              <h2>Payment failed</h2>
              <p className="checkout-sub">Please try again.</p>
              <button className="checkout-submit" onClick={() => setStep('form')}>Try again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
