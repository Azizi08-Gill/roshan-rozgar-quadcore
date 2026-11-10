import { useStore } from '../app/store';
import { Icon } from './Icon';
export default function LanguageToggle() {
  const { lang, setLang } = useStore();
  return <button type="button" className="language-toggle" aria-label={lang === 'ur' ? 'Switch to English' : 'Switch to Urdu'} onClick={() => setLang(lang === 'ur' ? 'en' : 'ur')}><Icon name="lang" size={16} /><span lang={lang === 'ur' ? 'en' : 'ur'}>{lang === 'ur' ? 'English' : 'اردو'}</span></button>;
}
