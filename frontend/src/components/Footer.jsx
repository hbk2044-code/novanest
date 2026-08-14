import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="footer-logo">
            <BrandLogo inverted />
          </div>
          <p style={{ fontSize: 14, maxWidth: 320 }}>
            Nepal's one-stop online marketplace. From daily groceries and hot cooked
            food to fashion, cosmetics and used electronics — everything delivered to
            your doorstep.
          </p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop">All Products</Link>
          <Link to="/shop?category=food">Food</Link>
          <Link to="/shop?category=groceries">Groceries</Link>
          <Link to="/shop?category=used-electronics">Used Electronics</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/orders">My Orders</Link>
        </div>
        <div>
          <h4>Contact</h4>
          <p style={{ fontSize: 14 }}>Kathmandu, Nepal</p>
          <p style={{ fontSize: 14 }}>+977-980-000-0000</p>
          <p style={{ fontSize: 14 }}>support@novanest.com</p>
        </div>
      </div>
    </footer>
  )
}
