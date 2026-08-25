import { SOCIAL_LINKS, WhatsAppIcon } from './SocialLinks.jsx'
import { useLang } from '../context/LanguageContext.jsx'

export default function WhatsAppFloat() {
  const { t } = useLang()
  return (
    <a
      className="whatsapp-float"
      href={SOCIAL_LINKS.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      title={t('footer.follow')}
    >
      <WhatsAppIcon size={28} />
    </a>
  )
}
