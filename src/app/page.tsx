import Link from "next/link"; // Used for internal test links

interface TestItem {
  id: string;
  name: string;
  description: string;
  duration: string;
  details: string;
  slug: string;
}

const tests: TestItem[] = [
  {
    id: '1',
    name: 'Abilità dominante (CHC)',
    description: 'Test perfezionato',
    duration: '~1Gf',
    details: 'Procedural Matrix CAT (8-12 item)',
    slug: 'abilita-dominante-chc',
  },
  {
    id: '2',
    name: 'Raven Adaptive Matrix',
    description: 'Test di ragionamento fluido',
    duration: '~10min',
    details: 'Adaptive Raven-style matrices with addition & rotation rules',
    slug: 'raven-adaptive',
  },
  {
    id: '3',
    name: 'Gs/Gsr + Gp',
    description: '',
    duration: '5min',
    details: '3-min PVT (reazione)',
    slug: 'gs-gsr-gp',
  },
  {
    id: '4',
    name: 'Gsm/WM + Ga',
    description: '',
    duration: '3min',
    details: 'Adaptive Dual-N Back',
    slug: 'gsm-wm-ga',
  },
  {
    id: '5',
    name: 'EF – inibizione',
    description: '',
    duration: '4min',
    details: 'Stop-Signal Adaptive (RT+SSD random)',
    slug: 'ef-inibizione',
  },
  {
    id: '6',
    name: 'EF – flessibilità',
    description: '',
    duration: '4min',
    details: 'Colour-Shape Switch (random switch rate)',
    slug: 'ef-flessibilita',
  },
  {
    id: '7',
    name: 'Glr',
    description: '',
    duration: '4min',
    details: 'Paired-Associate Abstract',
    slug: 'glr',
  },
  {
    id: '8',
    name: 'Gv',
    description: '',
    duration: '4min',
    details: '3-D Mental Rotation procedurale',
    slug: 'gv',
  },
  {
    id: '9',
    name: 'Gc',
    description: '',
    duration: '4min',
    details: 'Lexical Decision Adaptivo',
    slug: 'gc',
  },
  {
    id: '10',
    name: 'Cognizione sociale',
    description: '',
    duration: '4min',
    details: 'Dynamic Emotion Recognition GAN',
    slug: 'cognizione-sociale',
  },
  {
    id: '11',
    name: 'Vigilanza/motivazione',
    description: '',
    duration: '4min',
    details: 'Short CPT (1-back, 140 stim)',
    slug: 'vigilanza-motivazione',
  },
];

export default function Home() {
  return ( // Corrected: Ensured no stray characters after the opening parenthesis
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[family-name:var(--font-geist-sans)]">
      <header className="bg-blue-600 text-white py-8 mb-12">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Test Cognitivi Avanzati</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            L&apos;obiettivo di questa piattaforma è offrire test che non soffrono dell&apos;effetto pratica,
            così puoi monitorare i tuoi progressi ogni mese.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-3">Scegli un test</h2>
          <p className="text-lg opacity-80">
            Inizia da uno dei test disponibili per mettere alla prova le tue capacità.
          </p>
        </div>

        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <div
                key={test.id}
                className="border border-black/[.15] dark:border-white/[.15] rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-neutral-900"
              >
                <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">
                  {test.id}. {test.name}
                </h2>
                {test.description && (
                  <p className="text-sm text-[var(--foreground)] opacity-70 mb-1">
                    {test.description}
                  </p>
                )}
                <p className="text-sm text-[var(--foreground)] opacity-90 mb-1">
                  <strong>Details:</strong> {test.details}
                </p>
                <p className="text-sm text-[var(--foreground)] opacity-90 mb-4">
                  <strong>Duration:</strong> {test.duration}
                </p>
                <Link
                  href={`/tests/${test.slug}`}
                  className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-300 text-sm font-medium"
                >
                  Avvia Test
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Fine sezione introduttiva Next.js rimossa */}
      </main>

      <footer className="p-8 mt-12 border-t border-black/[.1] dark:border-white/[.1] text-center">
        <p className="text-sm opacity-70">
          Cognitive Test Suite &copy; 2025. For research and development purposes.
        </p>
      </footer>
    </div>
  );
}
