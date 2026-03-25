import { IntegrationLogo, IntegrationLogoProps } from '@/components/ui/IntegrationLogo';

type Integration = Omit<IntegrationLogoProps, never>;

const integrations: Integration[] = [
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

const categories: {
  key: Integration['category'];
  label: string;
}[] = [
  { key: 'health-fitness', label: 'Health & Fitness' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'wearables', label: 'Wearables' },
  { key: 'messaging', label: 'Messaging' },
];

export default function IntegrationsSection() {
  return (
    <section id="integrations" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Works With Your Favourite Tools
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect WellFlow to the apps and devices you already use — so your wellness data,
            calendar, and conversations all work together seamlessly.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-10">
          {categories.map(({ key, label }) => {
            const items = integrations.filter((i) => i.category === key);
            return (
              <div key={key}>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-indigo-600 mb-4">
                  {label}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {items.map((integration) => (
                    <IntegrationLogo key={integration.id} {...integration} />
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
