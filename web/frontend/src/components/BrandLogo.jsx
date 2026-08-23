import { useBranding } from '../context/BrandingContext.jsx'

export default function BrandLogo({ inverted = false }) {
  const { branding } = useBranding()
  const { appName = 'NovaNest', logo = '', icon = '🛍️' } = branding || {}

  return (
    <span className={`brand-logo ${inverted ? 'brand-logo-inverted' : ''}`}>
      {logo ? (
        <img className="brand-logo-img" src={logo} alt={appName} />
      ) : (
        <span className="brand-logo-icon">{icon}</span>
      )}
      <span className="brand-logo-name">{appName}</span>
    </span>
  )
}
