import Image from "next/image";
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
    name: 'Raven Adaptive Matrix',
    description: 'Test di ragionamento fluido',
    duration: '~10min',
    details: 'Adaptive Raven-style matrices with addition & rotation rules',
    slug: 'raven-adaptive',
  },
  {
    id: '2',
    name: 'Abilità dominante (CHC)',
    description: 'Test perfezionato',
    duration: '~1Gf',
    details: 'Procedural Matrix CAT (8-12 item)',
    slug: 'abilita-dominante-chc',
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
      <header className="p-8 border-b border-black/[.1] dark:border-white/[.1]">
        <div className="container mx-auto flex flex-col items-center sm:flex-row sm:justify-between">
          <Image
            className="dark:invert mb-4 sm:mb-0"
            src="/next.svg"
            alt="Next.js logo"
            width={140}
            height={28}
            priority
          />
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <a
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm h-10 px-4"
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={18}
                height={18}
              />
              Deploy now
            </a>
            <a
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm h-10 px-4 w-full sm:w-auto"
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our docs
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Cognitive Tests Suite</h1>
          <p className="text-lg opacity-80">
            Select a test below to proceed.
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
                  Start Test
                </Link>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold mb-4">Original Next.js Content</h2>
          <p className="text-sm opacity-70 mb-6">The default content from Create Next App is preserved below for reference.</p>
        </div>
        
        <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center p-8 pb-12 gap-12 sm:p-12 border border-dashed border-black/[.1] dark:border-white/[.1] rounded-lg">
          <div className="flex flex-col gap-[24px] row-start-2 items-center sm:items-start">
            <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
              <li className="mb-2 tracking-[-.01em]">
                Get started by editing{" "}
                <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
                  src/app/page.tsx
                </code>.
              </li>
              <li className="tracking-[-.01em]">
                Save and see your changes instantly.
              </li>
            </ol>
          </div>
          <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center mt-8">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm"
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/file.svg"
                alt="File icon"
                width={16}
                height={16}
              />
              Learn
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm"
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/window.svg"
                alt="Window icon"
                width={16}
                height={16}
              />
              Examples
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm"
              href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
              />
              Go to nextjs.org →
            </a>
          </footer>
        </div>
      </main>

      <footer className="p-8 mt-12 border-t border-black/[.1] dark:border-white/[.1] text-center">
        <p className="text-sm opacity-70">
          Cognitive Test Suite &copy; 2025. For research and development purposes.
        </p>
      </footer>
    </div>
  );
}
