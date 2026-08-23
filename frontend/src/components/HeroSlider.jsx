import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LanguageContext.jsx'

const FONT_SIZE_MAP = {
  small: { fontSize: 30, subtitle: 15 },
  medium: { fontSize: 36, subtitle: 16 },
  large: { fontSize: 44, subtitle: 17 },
  xlarge: { fontSize: 54, subtitle: 18 },
}

export default function HeroSlider({ banners, autoPlayMs = 6000 }) {
  const { t } = useLang()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setIndex((i) => (i + 1) % banners.length), [banners.length])
  const prev = () => setIndex((i) => (i - 1 + banners.length) % banners.length)

  useEffect(() => {
    setIndex(0)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1 || paused) return
    const t = setInterval(next, autoPlayMs)
    return () => clearInterval(t)
  }, [banners.length, paused, autoPlayMs, next])

  if (banners.length === 0) return null

  const banner = banners[index]

  const size = FONT_SIZE_MAP[banner.fontSize] || FONT_SIZE_MAP.large

  const backgroundStyle = (() => {
    if (banner.bgType === 'image' && banner.image) {
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${banner.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    if (banner.bgType === 'solid') {
      return { background: banner.bgColor1 || '#5b21b6' }
    }
    return {
      background: `linear-gradient(120deg, ${banner.bgColor1 || '#5b21b6'} 0%, ${banner.bgColor2 || '#a855f7'} 100%)`,
    }
  })()

  const justifyContent = banner.align === 'center' ? 'center' : banner.align === 'right' ? 'flex-end' : 'flex-start'
  const textAlign = banner.align || 'left'

  return (
    <div
      className="hero"
      style={{
        ...backgroundStyle,
        color: banner.textColor || '#fff',
        padding: '52px 48px',
        margin: '28px 0 48px',
        borderRadius: 24,
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        justifyContent,
        textAlign,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{ maxWidth: 640 }}>
        {banner.badge && (
          <div
            className="hero-badge"
            style={{ background: 'rgba(255,255,255,0.18)', color: 'inherit' }}
          >
            {banner.badge}
          </div>
        )}
        <h1 style={{ fontFamily: banner.fontFamily, fontSize: size.fontSize, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15, marginBottom: 14 }}>
          {banner.title && <>{banner.title} </>}
          {banner.titleHighlight && (
            <span
              style={{
                color: banner.buttonColor,
                textDecoration: 'underline',
                textDecorationColor: 'rgba(255,255,255,0.4)',
                textUnderlineOffset: 8,
                textDecorationThickness: 4,
              }}
            >
              {banner.titleHighlight}
            </span>
          )}
        </h1>
        {banner.subtitle && (
          <p style={{ fontFamily: banner.fontFamily, fontSize: size.subtitle, opacity: 0.92, maxWidth: 520, marginBottom: 26 }}>
            {banner.subtitle}
          </p>
        )}
        {banner.buttonText && (
          <Link
            to={banner.buttonLink || '/shop'}
            className="btn btn-lg"
            style={{ background: banner.buttonColor, color: '#fff', fontWeight: 700 }}
          >
            {banner.buttonText}
          </Link>
        )}
      </div>

      {banner.image && banner.bgType !== 'image' && (
        <div style={{ position: 'absolute', right: 32, top: 32, bottom: 32, width: '36%', borderRadius: 18, overflow: 'hidden', opacity: 0.95, boxShadow: '0 18px 40px rgba(0,0,0,0.25)' }}>
          <img src={banner.image} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {banners.length > 1 && (
        <>
          <button
            className="slide-arrow left"
            onClick={prev}
            aria-label={t('slider.prev')}
          >
            ‹
          </button>
          <button
            className="slide-arrow right"
            onClick={next}
            aria-label={t('slider.next')}
          >
            ›
          </button>
          <div className="slide-dots">
            {banners.map((b, i) => (
              <button
                key={b.id}
                className={`dot ${i === index ? 'active' : ''}`}
                style={i === index ? { background: banner.buttonColor } : {}}
                onClick={() => setIndex(i)}
                aria-label={t('slider.goto', { n: i + 1 })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
