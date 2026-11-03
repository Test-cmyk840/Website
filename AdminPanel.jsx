import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';

const COURIERS = ['Aramex', 'DHL', 'FedEx', 'Nepal Post', 'Nepal Post EMS', 'Upaya City Cargo', 'Other'];

const EMPTY_FORM = {
  name: '', description: '', base_price: 0, price_npr: 0, price_gbp: 0, price_usd: 0, stock_quantity: 0, category_id: '', 
  imageUrl: '',
  imageUrl2: '', // ✅ ADDED: Hover Image
};

const STATUS_STYLES = {
  paid: { color: '#22c55e', bg: '#f0fdf4' }, completed: { color: '#22c55e', bg: '#f0fdf4' }, delivered: { color: '#16a34a', bg: '#f0fdf4' },
  pending: { color: '#a16207', bg: '#fffbeb' }, failed: { color: '#b91c1c', bg: '#fef2f2' }, cancelled: { color: '#6b6b6b', bg: '#f5f5f5' },
  shipped: { color: '#2563eb', bg: '#eff6ff' }, in_transit: { color: '#2563eb', bg: '#eff6ff' }, processing: { color: '#2563eb', bg: '#eff6ff' },
  refunded: { color: '#6b6b6b', bg: '#f5f5f5' },
};

function StatusPill({ status }) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  const style = STATUS_STYLES[s] || STATUS_STYLES.pending;
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500, color: style.color, background: style.bg }}>{status}</span>;
}

async function apiCall(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = localStorage.getItem('lani_admin_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  try {
    const response = await fetch(`${API_URL}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch (error) {
    return { ok: false, data: { error: { message: error.message } } };
  }
}

export default function AdminPanel({ onClose }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [shipModalOrder, setShipModalOrder] = useState(null);

  const notify = (type, text) => setMessage({ type, text });

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const token = localStorage.getItem('lani_admin_token');
    if (token) { setIsLoggedIn(true); setShowLoginModal(false); }
    else { setShowLoginModal(true); }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      const { ok, data } = await apiCall('/api/categories');
      if (ok) setCategories(data.data || []);
    })();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === 'products') fetchProducts();
    else if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'payments') fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, activeTab]);

  const fetchProducts = async () => {
    setLoading(true);
    const { ok, data } = await apiCall('/api/products');
    setLoading(false);
    if (ok) setProducts(data.data || []);
    else notify('error', data.error?.message || 'Could not load products');
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { ok, data } = await apiCall('/api/admin/orders', { auth: true });
    setLoading(false);
    if (ok) setOrders(data.data || []);
    else notify('error', data.error?.message || 'Could not load orders');
  };

  const fetchPayments = async () => {
    setLoading(true);
    const { ok, data } = await apiCall('/api/admin/payments', { auth: true });
    setLoading(false);
    if (ok) setPayments((data.data || []).filter((p) => String(p.status || '').toUpperCase() === 'COMPLETED'));
    else notify('error', data.error?.message || 'Could not load payments');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) return notify('error', 'Please enter your email and password');
    setLoading(true);
    const { ok, data } = await apiCall('/api/auth/login', { method: 'POST', body: { email: loginEmail, password: loginPassword } });
    setLoading(false);
    if (ok && data.data?.token) {
      localStorage.setItem('lani_admin_token', data.data.token);
      setIsLoggedIn(true); setShowLoginModal(false); setLoginEmail(''); setLoginPassword(''); setMessage(null);
    } else notify('error', data.error?.message || 'Incorrect email or password');
  };

  const handleLogout = () => {
    if (!window.confirm('Log out of the admin panel?')) return;
    localStorage.removeItem('lani_admin_token');
    setIsLoggedIn(false); setShowLoginModal(true); setProducts([]); setOrders([]); setPayments([]); setEditingId(null); setIsCreating(false); setMessage(null);
  };

  const handleFormChange = (event) => setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  const resetForm = () => { setFormData(EMPTY_FORM); setEditingId(null); setIsCreating(false); };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) return notify('error', 'Product name is required');
    if (!formData.category_id) return notify('error', 'Please select a category');

    const payload = {
      category_id: formData.category_id, name: formData.name.trim(), description: formData.description.trim(),
      base_price: parseInt(formData.base_price, 10) || 0, price_npr: parseInt(formData.price_npr, 10) || 0,
      price_gbp: parseInt(formData.price_gbp, 10) || 0, price_usd: parseInt(formData.price_usd, 10) || 0,
      stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
    };
    
    // ✅ ADDED: Send both images
    if (formData.imageUrl.trim()) payload.imageUrl = formData.imageUrl.trim();
    if (formData.imageUrl2.trim()) payload.imageUrl2 = formData.imageUrl2.trim();

    setLoading(true);
    const { ok, data } = await apiCall('/api/admin/products', { method: 'POST', body: payload, auth: true });
    setLoading(false);
    if (ok) { resetForm(); fetchProducts(); notify('success', 'Product created'); }
    else notify('error', data.error?.message || 'Could not create product');
  };

  const handleEditProduct = (product) => {
    setIsCreating(false);
    setEditingId(product.id);
    setFormData({
      name: product.name || '', description: product.description || '', base_price: product.base_price || 0,
      price_npr: product.price_npr || 0, price_gbp: product.price_gbp || 0, price_usd: product.price_usd || 0,
      stock_quantity: product.stock_quantity || 0, category_id: product.category_id || '', 
      imageUrl: product.image_url || '',
      imageUrl2: product.image_url_2 || '', // ✅ ADDED: Load hover image
    });
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    const payload = {
      name: formData.name.trim(), description: formData.description.trim(),
      base_price: parseInt(formData.base_price, 10) || 0, price_npr: parseInt(formData.price_npr, 10) || 0,
      price_gbp: parseInt(formData.price_gbp, 10) || 0, price_usd: parseInt(formData.price_usd, 10) || 0,
      stock_quantity: parseInt(formData.stock_quantity, 10) || 0,
    };
    
    // ✅ ADDED: Update both images
    if (formData.imageUrl.trim()) payload.imageUrl = formData.imageUrl.trim();
    if (formData.imageUrl2.trim()) payload.imageUrl2 = formData.imageUrl2.trim();

    setLoading(true);
    const { ok, data } = await apiCall(`/api/admin/products/${editingId}`, { method: 'PATCH', body: payload, auth: true });
    setLoading(false);
    if (ok) { resetForm(); fetchProducts(); notify('success', 'Product updated'); }
    else notify('error', data.error?.message || 'Could not update product');
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    setLoading(true);
    const { ok, data } = await apiCall(`/api/admin/products/${id}`, { method: 'DELETE', auth: true });
    setLoading(false);
    if (ok) { fetchProducts(); notify('success', 'Product deleted'); }
    else notify('error', data.error?.message || 'Could not delete product');
  };

  const openShipModal = (order) => setShipModalOrder(order);
  const closeShipModal = () => setShipModalOrder(null);
  const submitShipment = async ({ courier_name, tracking_number }) => {
    if (!shipModalOrder) return;
    setLoading(true);
    const { ok, data } = await apiCall(`/api/admin/orders/${shipModalOrder.id}/shipment`, { method: 'POST', body: { courier_name, tracking_number }, auth: true });
    setLoading(false);
    if (ok) { closeShipModal(); fetchOrders(); notify('success', 'Shipment created'); }
    else notify('error', data.error?.message || 'Could not create shipment');
  };
  const handleMarkDelivered = async (shipmentId) => {
    if (!window.confirm('Mark this shipment as delivered?')) return;
    setLoading(true);
    const { ok, data } = await apiCall(`/api/admin/shipments/${shipmentId}`, { method: 'PATCH', body: { status: 'DELIVERED' }, auth: true });
    setLoading(false);
    if (ok) { notify('success', 'Marked as delivered'); fetchOrders(); }
    else notify('error', data.error?.message || 'Could not update shipment');
  };

  if (showLoginModal) {
    return (
      <div className="admin-login-modal-overlay">
        <div className="admin-login-modal">
          <button className="admin-login-modal-close" onClick={onClose}>✕</button>
          <h1 className="admin-login-modal-title">LANI</h1>
          <p className="admin-login-modal-subtitle">Admin Access</p>
          {message && <div className={`admin-message admin-message--${message.type}`}>{message.text}</div>}
          <form className="admin-form" onSubmit={handleLogin}>
            <div className="admin-field"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required /></div>
            <div className="admin-field"><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /></div>
            <button className="admin-btn admin-btn--primary admin-btn--block" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="admin-dashboard-page">
        <header className="admin-header">
          <div className="admin-header-content">
            <h1 className="admin-title">LANI Dashboard</h1>
            <nav className="admin-tabs">
              <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>Products</button>
              <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Orders</button>
              <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>Payments</button>
            </nav>
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn admin-btn--ghost" onClick={handleLogout}>Log out</button>
            <button className="admin-close-btn" onClick={onClose}>✕</button>
          </div>
        </header>

        {message && <div className={`admin-message admin-message--${message.type}`}>{message.text}</div>}

        <main className="admin-main">
          {activeTab === 'products' && (
            <>
              {!isCreating && !editingId && (
                <button className="admin-btn admin-btn--primary admin-btn--add" onClick={() => { setIsCreating(true); setFormData({ ...EMPTY_FORM, category_id: categories[0]?.id || '' }); }}>
                  + Add product
                </button>
              )}
              {isCreating && <ProductForm mode="create" formData={formData} onChange={handleFormChange} onSubmit={handleCreateProduct} onCancel={resetForm} loading={loading} categories={categories} />}
              {editingId && <ProductForm mode="edit" formData={formData} onChange={handleFormChange} onSubmit={handleSaveProduct} onCancel={resetForm} loading={loading} categories={categories} />}

              {!isCreating && !editingId && (
                <div className="admin-list">
                  {loading && products.length === 0 ? <p className="admin-empty">Loading…</p> : products.length === 0 ? <p className="admin-empty">No products yet.</p> : (
                    products.map((product) => (
                      <article className="admin-product" key={product.id}>
                        <div className="admin-product-thumb">{product.image_url && <img src={product.image_url} alt="" />}</div>
                        <div className="admin-product-body">
                          <h4 className="admin-product-name">{product.name}</h4>
                          {product.description && <p className="admin-product-desc">{product.description}</p>}
                          <div className="admin-product-meta">
                            <span>Rs. {product.price_npr || 0}</span><span>£{product.price_gbp || 0}</span><span>${product.price_usd || 0}</span><span>Stock {product.stock_quantity ?? 0}</span>
                          </div>
                        </div>
                        <div className="admin-product-actions">
                          <button className="admin-btn admin-btn--outline" onClick={() => handleEditProduct(product)}>Edit</button>
                          <button className="admin-btn admin-btn--danger" onClick={() => handleDeleteProduct(product.id)}>Delete</button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'orders' && (
            <div className="admin-list">
              {loading && orders.length === 0 ? <p className="admin-empty">Loading…</p> : orders.length === 0 ? <p className="admin-empty">No orders yet.</p> : (
                orders.map((order) => (
                  <article className="admin-order" key={order.id}>
                    <header className="admin-order-head">
                      <span className="admin-order-id">#{String(order.id).slice(0, 8)}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <StatusPill status={order.status} /><StatusPill status={order.payment_status} />{order.shipment_status && <StatusPill status={order.shipment_status} />}
                      </div>
                    </header>
                    <div className="admin-order-grid">
                      <p><span>Customer</span>{order.customer_name || order.shipping_email || '—'}</p>
                      <p><span>Email</span>{order.shipping_email || '—'}</p>
                      <p><span>Phone</span>{order.shipping_phone || '—'}</p>
                      <p><span>Total</span>Rs. {order.total}</p>
                      <p><span>Fonepay ref</span><code style={{ fontSize: 11 }}>{order.fonepay_reference || '—'}</code></p>
                      <p><span>Paid at</span>{order.paid_at ? new Date(order.paid_at).toLocaleString() : '—'}</p>
                    </div>
                    {order.tracking_number && (
                      <div className="admin-shipment-box">
                        <div className="admin-shipment-label">Shipment</div>
                        <div className="admin-shipment-line"><strong>{order.courier_name || 'Courier'}</strong><span className="admin-shipment-sep">·</span><span className="admin-shipment-mono">{order.tracking_number}</span></div>
                        <div className="admin-shipment-meta">{order.shipment_status}{order.shipped_date && ` · Shipped ${new Date(order.shipped_date).toLocaleDateString()}`}{order.delivered_date && ` · Delivered ${new Date(order.delivered_date).toLocaleDateString()}`}</div>
                      </div>
                    )}
                    {order.status === 'PAID' && !order.tracking_number && (
                      <div className="admin-order-actions"><button className="admin-btn admin-btn--primary" onClick={() => openShipModal(order)} disabled={loading}>Ship Order</button></div>
                    )}
                    {order.shipment_id && order.shipment_status !== 'DELIVERED' && (
                      <div className="admin-order-actions"><button className="admin-btn admin-btn--outline" onClick={() => handleMarkDelivered(order.shipment_id)} disabled={loading}>Mark as Delivered</button></div>
                    )}
                  </article>
                ))
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="admin-list">
              {loading && payments.length === 0 ? <p className="admin-empty">Loading…</p> : payments.length === 0 ? <p className="admin-empty">No successful payments yet.</p> : (
                payments.map((p) => (
                  <article className="admin-order" key={p.id}>
                    <header className="admin-order-head"><span className="admin-order-id">#{String(p.order_id).slice(0, 8)}</span><StatusPill status={p.status} /></header>
                    <div className="admin-order-grid">
                      <p><span>Provider</span>{p.payment_provider || '—'}</p><p><span>Amount</span>{p.currency || 'NPR'} {p.amount}</p>
                      <p><span>Reference</span><code style={{ fontSize: 11 }}>{p.provider_reference || '—'}</code></p><p><span>Transaction ID</span><code style={{ fontSize: 11 }}>{p.provider_transaction_id || '—'}</code></p>
                      <p><span>Paid at</span>{p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}</p><p><span>Created</span>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </main>

        {shipModalOrder && <ShipmentModal order={shipModalOrder} onClose={closeShipModal} onSubmit={submitShipment} loading={loading} />}
      </div>
    );
  }
  return null;
}

function ProductForm({ mode, formData, onChange, onSubmit, onCancel, loading, categories = [] }) {
  const isEdit = mode === 'edit';
  return (
    <form className="admin-form admin-form--card" onSubmit={onSubmit}>
      <h3 className="admin-form-title">{isEdit ? 'Edit product' : 'New product'}</h3>
      {!isEdit && (
        <div className="admin-field">
          <label htmlFor="p-category">Category</label>
          <select id="p-category" name="category_id" value={formData.category_id} onChange={onChange} required>
            {categories.length === 0 ? <option value="">Loading categories…</option> : categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div className="admin-field"><label htmlFor="p-name">Name</label><input id="p-name" type="text" name="name" value={formData.name} onChange={onChange} required /></div>
      <div className="admin-field"><label htmlFor="p-desc">Description</label><textarea id="p-desc" name="description" rows="3" value={formData.description} onChange={onChange} /></div>
      
      <div className="admin-field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div className="admin-field"><label htmlFor="p-npr">Price (NPR)</label><input id="p-npr" type="number" name="price_npr" min="0" value={formData.price_npr} onChange={onChange} /></div>
        <div className="admin-field"><label htmlFor="p-gbp">Price (GBP)</label><input id="p-gbp" type="number" name="price_gbp" min="0" value={formData.price_gbp} onChange={onChange} /></div>
        <div className="admin-field"><label htmlFor="p-usd">Price (USD)</label><input id="p-usd" type="number" name="price_usd" min="0" value={formData.price_usd} onChange={onChange} /></div>
      </div>

      <div className="admin-field"><label htmlFor="p-stock">Stock</label><input id="p-stock" type="number" name="stock_quantity" min="0" value={formData.stock_quantity} onChange={onChange} /></div>
      
      <div className="admin-field">
        <label htmlFor="p-img">Main Image URL</label>
        <input id="p-img" type="url" name="imageUrl" value={formData.imageUrl} onChange={onChange} placeholder="https://example.com/image.jpg" />
        <small style={{ display: 'block', marginTop: '4px', color: '#999', fontSize: '11px' }}>Paste a direct image link</small>
      </div>

      {/* ✅ ADDED: Hover Image Field */}
      <div className="admin-field">
        <label htmlFor="p-img-2">Hover Image URL (Optional)</label>
        <input id="p-img-2" type="url" name="imageUrl2" value={formData.imageUrl2} onChange={onChange} placeholder="https://example.com/hover-image.jpg" />
        <small style={{ display: 'block', marginTop: '4px', color: '#999', fontSize: '11px' }}>This image shows when the user hovers over the product.</small>
      </div>

      <div className="admin-form-actions">
        <button className="admin-btn admin-btn--primary" type="submit" disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}</button>
        <button className="admin-btn admin-btn--ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
      </div>
    </form>
  );
}

function ShipmentModal({ order, onClose, onSubmit, loading }) {
  const [courier, setCourier] = useState('Aramex');
  const [customCourier, setCustomCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const finalCourier = courier === 'Other' ? customCourier.trim() : courier;
    if (!finalCourier) return setError('Please enter a courier name');
    if (!tracking.trim()) return setError('Please enter a tracking number');
    onSubmit({ courier_name: finalCourier, tracking_number: tracking.trim() });
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="admin-modal-close" onClick={onClose}>×</button>
        <h2 className="admin-modal-title">Ship Order</h2>
        <p className="admin-modal-sub">#{String(order.id).slice(0, 8)} · {order.customer_name || order.shipping_email}</p>
        <div className="admin-modal-dest">
          <div className="admin-modal-dest-label">Shipping to</div>
          <div className="admin-modal-dest-value">{order.shipping_address || '—'}{order.shipping_city ? `, ${order.shipping_city}` : ''}{order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ''}{order.shipping_country ? `, ${order.shipping_country}` : ''}</div>
          {order.shipping_phone && <div className="admin-modal-dest-phone">{order.shipping_phone}</div>}
        </div>
        {error && <div className="admin-modal-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="admin-modal-field">
            <label>Courier</label>
            <select value={courier} onChange={(e) => setCourier(e.target.value)}>{COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          {courier === 'Other' && (
            <div className="admin-modal-field"><label>Courier name</label><input type="text" value={customCourier} onChange={(e) => setCustomCourier(e.target.value)} placeholder="e.g. Local courier" required /></div>
          )}
          <div className="admin-modal-field"><label>Tracking number</label><input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. AWB123456789" required autoFocus /></div>
          <p className="admin-modal-hint">The customer will receive an email with the tracking number and a link to track the shipment.</p>
          <div className="admin-modal-actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>{loading ? 'Creating…' : 'Confirm & Notify Customer'}</button>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
