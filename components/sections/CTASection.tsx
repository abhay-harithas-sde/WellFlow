import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function CTASection() {
  const t = useTranslations('cta');

  return (
    <section id="cta" aria-label={t('headline')} className="bg-gray-900 border-t border-gray-800 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">{t('headline')}</h2>
        <p className="mt-4 text-lg text-gray-400">{t('subheadline')}</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/raw" className="inline-block rounded-xl bg-green-600 px-8 py-3 text-base font-semibold text-white hover:bg-green-500 transition-colors">
            {t('primary')}
          </a>
          <a href="#pricing" className="text-base font-medium text-gray-400 hover:text-white transition-colors">
            {t('secondary')}
          </a>
        </div>
      </div>
    </section>
  );
}
