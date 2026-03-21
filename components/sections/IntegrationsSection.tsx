import { useTranslations } from 'next-intl';
import { IntegrationLogo, IntegrationLogoProps } from '@/components/ui/IntegrationLogo';

type Integration = Omit<IntegrationLogoProps, 'categoryLabel' | 'description'>;

const integrations: Integration[] = [
  // Voice & AI
  { id: 'murf-ai', name: 'Murf AI', logoSrc: '🎙️', category: 'voice-ai' },
  // Wellness Platform
  { id: 'wellflow', name: 'WellFlow Platform', logoSrc: '🌊', category: 'wellness-platform' },
  // Health & Fitness
  { id: 'apple-health', name: 'Apple Health', logoSrc: '🍎', category: 'health-fitness' },
  { id: 'google-fit', name: 'Google Fit', logoSrc: '🏃', category: 'health-fitness' },
  { id: 'fitbit', name: 'Fitbit', logoSrc: '💪', category: 'health-fitness' },
  { id: 'garmin', name: 'Garmin', logoSrc: '⌚', category: 'health-fitness' },
  // Calendar
  { id: 'google-calendar', name: 'Google Calendar', logoSrc: '📅', category: 'calendar' },
  { id: 'apple-calendar', name: 'Apple Calendar', logoSrc: '🗓️', category: 'calendar' },
  { id: 'outlook', name: 'Outlook', logoSrc: '📧', category: 'calendar' },
  // Wearables
  { id: 'apple-watch', name: 'Apple Watch', logoSrc: '⌚', category: 'wearables' },
  { id: 'wear-os', name: 'Wear OS', logoSrc: '🤖', category: 'wearables' },
  { id: 'oura', name: 'Oura', logoSrc: '💍', category: 'wearables' },
  // Messaging
  { id: 'slack', name: 'Slack', logoSrc: '💬', category: 'messaging' },
  { id: 'whatsapp', name: 'WhatsApp', logoSrc: '📱', category: 'messaging' },
  { id: 'telegram', name: 'Telegram', logoSrc: '✈️', category: 'messaging' },
];

type CategoryKey = Integration['category'];

const categoryOrder: CategoryKey[] = [
  'voice-ai',
  'wellness-platform',
  'health-fitness',
  'calendar',
  'wearables',
  'messaging',
];

export default function IntegrationsSection() {
  const t = useTranslations('integrations');

  const categoryLabels: Record<CategoryKey, string> = {
    'voice-ai': t('categories.voiceAI'),
    'wellness-platform': t('categories.wellnessPlatform'),
    'health-fitness': t('categories.healthFitness'),
    calendar: t('categories.calendar'),
    wearables: t('categories.wearables'),
    messaging: t('categories.messaging'),
  };

  const descriptionMap: Partial<Record<string, string>> = {
    'murf-ai': t('murf.desc'),
    wellflow: t('wellflow.desc'),
  };

  return (
    <section id="integrations" className="py-20 bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {t('intro')}
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-10">
          {categoryOrder.map((key) => {
            const items = integrations.filter((i) => i.category === key);
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-green-400 mb-4">
                  {categoryLabels[key]}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {items.map((integration) => (
                    <IntegrationLogo
                      key={integration.id}
                      {...integration}
                      categoryLabel={categoryLabels[key]}
                      description={descriptionMap[integration.id]}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
