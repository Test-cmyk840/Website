import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './SocialIcons.css';
import AdminPanel from './AdminPanel';
import CheckoutModal from './CheckoutModal';
import laniLogoRed from './res.svg';

// ============================================================================
// --- CLOUDFLARE R2 URLS ---
// ============================================================================

const INSPIRATION_IMAGES = [
  "https://images.laniofficial.com/inspiration/blue lake photo.jpg",
  "https://images.laniofficial.com/inspiration/IMG_7582.jpg",
  "https://images.laniofficial.com/inspiration/gurash.webp",
  "https://images.laniofficial.com/inspiration/DSCF6833.jpg",
  "https://images.laniofficial.com/inspiration/DSCF5350.jpg"
];

const LOOKBOOK_IMAGES = [
  "https://images.laniofficial.com/lookbook/DSCF6584.jpg",
  "https://images.laniofficial.com/lookbook/DSCF8725.jpg",
  "https://images.laniofficial.com/lookbook/DSCF8693.jpg",
  "https://images.laniofficial.com/lookbook/DSCF8176.jpg",
  "https://images.laniofficial.com/lookbook/DSCF7638.jpg",
  "https://images.laniofficial.com/lookbook/DSCF8742.jpg"
];

const HANDCRAFTED_VIDEO = "https://images.laniofficial.com/videos/reel 1.MOV";
const COLLECTION_VIDEO = "https://images.laniofficial.com/videos/LANNI.mp4";
const DONATION_VIDEO = "https://images.laniofficial.com/donation.mp4";
const DONATION_QR = "https://images.laniofficial.com/donation-qr.png";

const API_URL = process.env.REACT_APP_API_URL || 'https://api.laniofficial.com';

const SOCIAL_LINKS = [
  { name: 'Instagram', url: 'https://www.instagram.com/lani_handcraftedjewelry/' },
  { name: 'Facebook', url: 'https://www.facebook.com/people/Lani-Jewelry/61591156885649/' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@lanihandcraftedjewelry' },
];

const SOCIAL_ICONS = {
  Instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" />
    </>
  ),
  Facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  TikTok: (
    <>
      <path d="M16 3v11.5a5.5 5.5 0 1 1-5.5-5.5" />
      <path d="M16 3a5 5 0 0 0 5 5" />
    </>
  ),
};

function App() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('lani_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [products, setProducts] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  const [heroIndex, setHeroIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [slideshowStarted, setSlideshowStarted] = useState(false);

  const logoClicks = useRef(0);
  const logoTimer = useRef(null);

  // Refs for videos (foreground + blurred background pairs)
  const handcraftedVideoRef = useRef(null);
  const handcraftedVideoBgRef = useRef(null);
  const collectionVideoRef = useRef(null);
  const donationVideoRef = useRef(null);
  const donationVideoBgRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/api/fonepay/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/products`);
        const data = await response.json();
        setProducts(data.data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('lani_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    INSPIRATION_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const startTimer = setTimeout(() => setSlideshowStarted(true), 5000);
    return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    if (!slideshowStarted) return;
    const interval = setInterval(() => {
      setPrevIndex(heroIndex);
      setHeroIndex((i) => (i + 1) % INSPIRATION_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroIndex, slideshowStarted]);

  useEffect(() => {
    return () => clearTimeout(logoTimer.current);
  }, []);

  // Intersection Observer: play/pause all video layers (fg + bg) based on visibility
  useEffect(() => {
    const videoRefs = [
      handcraftedVideoRef.current,
      handcraftedVideoBgRef.current,
      collectionVideoRef.current,
      donationVideoRef.current,
      donationVideoBgRef.current,
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.3 }
    );

    videoRefs.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => {
      videoRefs.forEach((video) => {
        if (video) observer.unobserve(video);
      });
    };
  }, []);

  const handleLogoClick = () => {
    logoClicks.current += 1;
    clearTimeout(logoTimer.current);
    if (logoClicks.current >= 5) {
      logoClicks.current = 0;
      setShowAdmin(true);
      return;
    }
    logoTimer.current = setTimeout(() => { logoClicks.current = 0; }, 1200);
  };

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => setCart(cart.filter((item) => item.id !== productId));

  const updateQuantity = (productId, quantity) => {
    const qty = parseInt(quantity, 10) || 0;
    if (qty <= 0) removeFromCart(productId);
    else setCart(cart.map((item) => item.id === productId ? { ...item, quantity: qty } : item));
  };

  const priceOf = (item) => {
    if (!item) return 0;
    return Number(item.price_npr ?? item.base_price ?? 0);
  };

  const formatPrice = (amount) => {
    const n = Math.round(Number(amount) || 0);
    return `Rs. ${n.toLocaleString('en-IN')}`;
  };

  const total = cart.reduce((sum, item) => sum + priceOf(item) * Number(item.quantity || 0), 0);

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setShowBag(false);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    setCart([]);
    localStorage.removeItem('lani_cart');
  };

  return (
    <div>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`}>
        <div className="logo" onClick={handleLogoClick}>
          <img src={laniLogoRed} alt="LANI Jewelry" className="nav-logo-img" />
        </div>

        <div id="site-menu" className={`nav-links ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
          <a href="#products">COLLECTION</a>
          <a href="#handcrafted">CRAFT</a>
          <a href="#lookbook">LOOKBOOK</a>
          <a href="#donation">DONATION</a>
          <a href="#about">ABOUT</a>
          <a href="#contact">CONTACT</a>
        </div>

        <div className="nav-actions">
          <div className="cart-icon" onClick={() => setShowBag(true)}>
            BAG <span className="cart-count">({cart.length})</span>
          </div>
          <button
            type="button"
            className="mobile-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </nav>

      <section className="hero">
        {INSPIRATION_IMAGES.map((img, index) => {
          let className = "hero-bg";
          if (!slideshowStarted) {
            if (index === 0) className += " first-load";
          } else {
            if (index === heroIndex) className += " active";
            else if (index === prevIndex) className += " prev";
          }
          return <img key={index} src={img} alt={`Inspiration ${index}`} className={className} loading={index === 0 ? "eager" : "lazy"} />;
        })}
        <div className="hero-content">
          <h1>LANI JEWELRY</h1>
          <p>Handcrafted luxury jewelry from the heart of Nepal</p>
          <a href="#products" className="btn-primary">EXPLORE COLLECTION</a>
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-content">
          <h2 className="section-title">About Lani</h2>
          <p className="about-text">Every piece in our collection is a testament to the skill, artistry, and passion of Nepal's finest craftspeople. Each design blends traditional techniques with contemporary aesthetics, creating jewelry that is both timeless and modern.</p>
          <p className="about-text">We believe in creating pieces that tell stories. Your stories. From delicate earrings to bold statement necklaces, every item is crafted with intention and care.</p>
        </div>
      </section>

      <section className="products-section" id="products">
        <h2 className="section-title">Our Collection</h2>
        <p className="collection-intro">Discover our carefully curated selection of handcrafted jewelry, each piece a unique expression of Nepalese artistry and contemporary design.</p>

        {/* COLLECTION VIDEO BANNER */}
        <div className="collection-video-banner">
          <video
            ref={collectionVideoRef}
            src={COLLECTION_VIDEO}
            className="collection-video"
            muted
            loop
            playsInline
          />
        </div>

        {loading ? (
          <p className="status-text">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="status-text">No products available</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <div key={product.id} className="product-card">

                <div className="image-container">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="product-img main-img" loading="lazy" />
                  )}

                  {product.image_url_2 && (
                    <img src={product.image_url_2} alt={`${product.name} alternate`} className="product-img hover-img" loading="lazy" />
                  )}

                  {product.stock_quantity === 0 && <div className="coming-soon-badge">Coming Soon</div>}
                </div>

                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="description">{product.description}</p>
                  <p className="price">{formatPrice(priceOf(product))}</p>
                  <button className={`btn-add ${product.stock_quantity === 0 ? 'disabled' : ''}`} onClick={() => addToCart(product)} disabled={product.stock_quantity === 0}>
                    {product.stock_quantity > 0 ? 'ADD TO BAG' : 'OUT OF STOCK'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HANDCRAFTED VIDEO SECTION — 9:16 Instagram reel + blurred bg */}
      <section className="handcrafted-section" id="handcrafted">
        <div className="handcrafted-text-content">
          <h2 className="section-title">The Art of Handmade.</h2>
          <p className="handcrafted-text">
            Every piece begins with a vision and comes to life through the hands of skilled artisans. From shaping the smallest details to the final touches, each step reflects patience, precision, and the beauty of traditional craftsmanship.
          </p>
          <p className="handcrafted-text">
            Rooted in Nepali artistry, made with passion, and crafted to tell a story. Because true beauty lies in the details, and no two handmade pieces are ever quite the same. ✨
          </p>
        </div>

        <div className="handcrafted-video-container">
          <video
            ref={handcraftedVideoBgRef}
            src={HANDCRAFTED_VIDEO}
            className="handcrafted-video-bg"
            muted
            loop
            playsInline
            aria-hidden="true"
          />
          <video
            ref={handcraftedVideoRef}
            src={HANDCRAFTED_VIDEO}
            className="video-fg"
            muted
            loop
            playsInline
          />
        </div>
      </section>

      <section className="lookbook-section" id="lookbook">
        <h2 className="section-title">Lookbook</h2>
        <p className="collection-intro">Inspiration drawn from the landscapes, culture, and heritage of Nepal.</p>
        <div className="lookbook-grid">
          {LOOKBOOK_IMAGES.map((img, index) => (
            <div key={index} className="lookbook-item">
              <img src={img} alt={`Lookbook ${index}`} className="lookbook-img" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <section className="donation-section" id="donation">
        <div className="donation-container">
          <div className="donation-text">
            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: '24px' }}>Our Mission</h2>
            <p className="about-text" style={{ textAlign: 'left', marginBottom: '24px' }}>
              We believe in giving back to the community that inspires us. A portion of every purchase goes towards supporting local artisans, education, and preserving traditional craftsmanship in Nepal.
            </p>
            <p className="about-text" style={{ textAlign: 'left', marginBottom: '40px' }}>
              Watch our story to see the direct impact of your support.
            </p>

            <div className="donation-info-box">
              <div className="donation-qr-container">
                <img src={DONATION_QR} alt="Scan to Donate" className="donation-qr" />
                <span>Scan to Donate</span>
              </div>

              <div className="donation-bank-details">
                <p><strong>Direct Bank Transfer:</strong></p>
                <p><strong>ICFC Finance Ltd.</strong></p>
                <p><strong>Susta Manasthiti Punasthapna Kendra</strong></p>
                <p>Account No: 00300100014426000002</p>
                <p>Branch: Banepa Branch</p>
              </div>
            </div>
          </div>

          <div className="donation-video-wrapper">
            <video
              ref={donationVideoBgRef}
              src={DONATION_VIDEO}
              className="donation-video-bg"
              muted
              loop
              playsInline
              aria-hidden="true"
            />
            <video
              ref={donationVideoRef}
              src={DONATION_VIDEO}
              className="donation-video"
              muted
              loop
              playsInline
            />
          </div>
        </div>
      </section>

      {showBag && (
        <div className="bag-modal-overlay" onClick={() => setShowBag(false)}>
          <div className="bag-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="bag-modal-header">
              <h2>Shopping Bag</h2>
              <button className="bag-modal-close" onClick={() => setShowBag(false)}>×</button>
            </div>
            <div className="bag-modal-content">
              {cart.length === 0 ? (
                <p className="bag-empty">Your bag is empty. Start shopping to add items.</p>
              ) : (
                <div className="bag-items-list">
                  {cart.map((item) => (
                    <div key={item.id} className="bag-item-row">
                      <div className="bag-item-img">
                        {item.image_url && <img src={item.image_url} alt={item.name} />}
                      </div>
                      <div className="bag-item-details-wrapper">
                        <div className="bag-item-info">
                          <p className="bag-item-name">{item.name}</p>
                          <p className="bag-item-price">{formatPrice(priceOf(item))}</p>
                        </div>
                        <div className="bag-item-controls">
                          <div className="bag-item-qty">
                            <button className="qty-minus" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                            <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)} min="1" />
                            <button className="qty-plus" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                          </div>
                          <div className="bag-item-total">{formatPrice(priceOf(item) * Number(item.quantity || 0))}</div>
                          <button className="bag-item-delete" onClick={() => removeFromCart(item.id)}>×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="bag-modal-footer">
                <div className="bag-summary-row bag-total"><span>Total</span><span>{formatPrice(total)}</span></div>
              </div>
            )}
            <div className="bag-modal-actions">
              <button className="bag-checkout-btn" onClick={handleCheckoutClick}>CHECKOUT</button>
              <button className="bag-continue-btn" onClick={() => setShowBag(false)}>CONTINUE SHOPPING</button>
            </div>
          </div>
        </div>
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showCheckout && <CheckoutModal cart={cart} total={total} onClose={() => setShowCheckout(false)} onSuccess={handlePaymentSuccess} />}

      <footer id="contact">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <div className="footer-logo"><img src={laniLogoRed} alt="LANI Jewelry" className="footer-logo-img" /></div>
            <p className="footer-tagline">Handcrafted luxury from Nepal</p>
            <p>Each piece is made by hand in our Kathmandu studio, in small batches, by craftspeople we know by name.</p>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <p><a href="mailto:jewelrylani060@gmail.com">jewelrylani060@gmail.com</a></p>
            <p>9714629762, 9714629763</p>
            <p>Kathmandu, Nepal</p>
          </div>
          <div className="footer-col">
            <h4>Follow</h4>
            <div className="social-links">
              {SOCIAL_LINKS.filter((link) => link.url).map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.name} title={link.name}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {SOCIAL_ICONS[link.name]}
                  </svg>
                </a>
              ))}
            </div>
            <p>New pieces and studio notes, posted as they're finished.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 LANI Jewelry. All rights reserved.</p>
          <p>Handcrafted in Kathmandu, Nepal.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
