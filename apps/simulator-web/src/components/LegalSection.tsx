import { MouseEvent, useEffect, useRef, useState } from 'react';
import type { ProductDefinition } from '@mlm/simulator-core';

type LegalView = 'imprint' | 'privacy';

export function LegalSection({ product }: { product: ProductDefinition }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeView, setActiveView] = useState<LegalView | null>(() =>
    getLegalViewFromHash(window.location.hash),
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setActiveView(getLegalViewFromHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    if (!activeView) return;

    sectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [activeView]);

  const handleLegalLinkClick =
    (view: LegalView) => (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();

      if (activeView === view) {
        window.history.pushState(null, '', window.location.pathname);
        setActiveView(null);
        return;
      }

      window.history.pushState(null, '', `#${getLegalHash(view)}`);
      setActiveView(view);
    };

  return (
    <footer className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
      <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <span>© 2026 {product.legal.siteName}. Alle Rechte vorbehalten.</span>
        <div className="flex items-center gap-3">
          <a
            href="#impressum"
            onClick={handleLegalLinkClick('imprint')}
            className={`transition hover:text-brand-700 ${
              activeView === 'imprint' ? 'text-brand-800 font-medium' : ''
            }`}
          >
            Impressum
          </a>
          <a
            href="#datenschutz"
            onClick={handleLegalLinkClick('privacy')}
            className={`transition hover:text-brand-700 ${
              activeView === 'privacy' ? 'text-brand-800 font-medium' : ''
            }`}
          >
            Datenschutz
          </a>
        </div>
      </div>

      {activeView && (
        <section
          ref={sectionRef}
          id={getLegalHash(activeView)}
          className="mt-5 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-7 scroll-mt-20"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Rechtliche Informationen
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-950">
                {activeView === 'imprint' ? 'Impressum' : 'Datenschutzerklärung'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                window.history.pushState(null, '', window.location.pathname);
                setActiveView(null);
              }}
              aria-label="Rechtliche Informationen schließen"
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {activeView === 'imprint' ? (
            <ImprintContent contactEmail={product.legal.contactEmail} />
          ) : (
            <PrivacyContent contactEmail={product.legal.contactEmail} />
          )}
        </section>
      )}
    </footer>
  );
}

function getLegalHash(view: LegalView) {
  return view === 'imprint' ? 'impressum' : 'datenschutz';
}

function getLegalViewFromHash(hash: string): LegalView | null {
  if (hash === '#impressum') return 'imprint';
  if (hash === '#datenschutz') return 'privacy';
  return null;
}

function ImprintContent({ contactEmail }: { contactEmail: string }) {
  return (
    <article className="legal-prose">
      <h3>Anbieter</h3>
      <address>
        Dirk Triltsch
        <br />
        betreibt diese Web-App
        <br />
        c/o COCENTER
        <br />
        Koppoldstr. 1
        <br />
        86551 Aichach
      </address>

      <h3>Kontakt</h3>
      <p>
        Telefon: 015678 334022
        <br />
        E-Mail:{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>

      <h3>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h3>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <p className="legal-meta">
        Grundlage: angepasst aus dem bestehenden eRecht24-Text.
      </p>
    </article>
  );
}

function PrivacyContent({ contactEmail }: { contactEmail: string }) {
  return (
    <article className="legal-prose">
      <h3>1. Datenschutz auf einen Blick</h3>
      <p>
        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit
        Ihren personenbezogenen Daten passiert, wenn Sie diese Web-App besuchen.
        Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
        identifiziert werden können.
      </p>

      <h4>Datenerfassung in dieser Web-App</h4>
      <p>
        Die Datenverarbeitung erfolgt durch den Betreiber dieser Web-App. Die
        Kontaktdaten finden Sie im Impressum und im Abschnitt „Hinweis zur
        verantwortlichen Stelle“.
      </p>
      <p>
        Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese
        mitteilen, zum Beispiel per E-Mail oder Telefon. Andere Daten werden
        automatisch beim Aufruf der Web-App durch die bereitstellende technische
        Infrastruktur erfasst. Das sind vor allem technische Daten wie
        Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs.
      </p>
      <p>
        Die Eingaben im Simulator werden lokal im Browser für die Berechnung
        verwendet und nach aktuellem Stand nicht an einen eigenen Server
        übertragen.
      </p>

      <h3>2. Hosting und technische Bereitstellung</h3>
      <p>
        Diese Web-App ist als statische Web-Anwendung vorgesehen. Beim Aufruf
        können durch den jeweiligen Hosting-Anbieter technische Zugriffsdaten
        verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit des
        Zugriffs, Browsertyp, Betriebssystem und die angeforderte Datei. Diese
        Verarbeitung dient der sicheren und fehlerfreien Bereitstellung der
        Web-App.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte
        Interesse liegt in einer zuverlässigen, sicheren und performanten
        Bereitstellung des Angebots.
      </p>

      <h3>3. Allgemeine Hinweise und Pflichtinformationen</h3>
      <h4>Datenschutz</h4>
      <p>
        Der Betreiber dieser Web-App nimmt den Schutz Ihrer persönlichen Daten
        sehr ernst. Personenbezogene Daten werden vertraulich und entsprechend
        den gesetzlichen Datenschutzvorschriften sowie dieser
        Datenschutzerklärung behandelt.
      </p>
      <p>
        Wir weisen darauf hin, dass die Datenübertragung im Internet, zum
        Beispiel bei der Kommunikation per E-Mail, Sicherheitslücken aufweisen
        kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist
        nicht möglich.
      </p>

      <h4>Hinweis zur verantwortlichen Stelle</h4>
      <p>Die verantwortliche Stelle für die Datenverarbeitung ist:</p>
      <address>
        Dirk Triltsch
        <br />
        c/o COCENTER
        <br />
        Koppoldstr. 1
        <br />
        86551 Aichach
      </address>
      <p>
        Telefon: 015678 334022
        <br />
        E-Mail:{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <p>
        Verantwortliche Stelle ist die natürliche oder juristische Person, die
        allein oder gemeinsam mit anderen über die Zwecke und Mittel der
        Verarbeitung von personenbezogenen Daten entscheidet.
      </p>

      <h4>Speicherdauer</h4>
      <p>
        Soweit innerhalb dieser Datenschutzerklärung keine speziellere
        Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei
        uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein
        berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur
        Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern keine
        anderen rechtlich zulässigen Gründe für die Speicherung bestehen.
      </p>

      <h4>Rechtsgrundlagen der Datenverarbeitung</h4>
      <p>
        Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir
        Ihre personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a
        DSGVO. Sind Ihre Daten zur Vertragserfüllung oder zur Durchführung
        vorvertraglicher Maßnahmen erforderlich, erfolgt die Verarbeitung auf
        Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Soweit eine rechtliche
        Verpflichtung besteht, erfolgt die Verarbeitung auf Grundlage von Art. 6
        Abs. 1 lit. c DSGVO. Darüber hinaus kann die Verarbeitung auf Grundlage
        unseres berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO
        erfolgen.
      </p>

      <h3>4. Ihre Rechte</h3>
      <p>
        Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft,
        Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu
        erhalten. Sie haben außerdem ein Recht auf Berichtigung oder Löschung
        dieser Daten. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt
        haben, können Sie diese Einwilligung jederzeit für die Zukunft
        widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die
        Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
        verlangen.
      </p>
      <p>
        Im Falle von Verstößen gegen die DSGVO steht Ihnen ein Beschwerderecht
        bei einer zuständigen Aufsichtsbehörde zu.
      </p>
      <p>
        Sie haben außerdem das Recht, Daten, die wir auf Grundlage Ihrer
        Einwilligung oder in Erfüllung eines Vertrags automatisiert verarbeiten,
        in einem gängigen, maschinenlesbaren Format aushändigen zu lassen.
      </p>

      <h3>5. Kontaktaufnahme</h3>
      <p>
        Wenn Sie uns per E-Mail oder Telefon kontaktieren, wird Ihre Anfrage
        inklusive aller daraus hervorgehenden personenbezogenen Daten zum Zweck
        der Bearbeitung Ihres Anliegens gespeichert und verarbeitet. Diese Daten
        geben wir nicht ohne Ihre Einwilligung weiter.
      </p>
      <p>
        Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO,
        sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder
        zur Durchführung vorvertraglicher Maßnahmen erforderlich ist. In allen
        übrigen Fällen beruht die Verarbeitung auf unserem berechtigten
        Interesse an der effektiven Bearbeitung der an uns gerichteten Anfragen
        nach Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <h3>6. Cookies, Analyse-Tools und Drittanbieter</h3>
      <p>
        Die aktuelle Web-App verwendet nach derzeitigem Stand keine eigenen
        Analyse-Tools, keine YouTube-Einbettungen und keine eigenen Cookies für
        Tracking- oder Marketingzwecke.
      </p>
      <p>
        Als installierbare Web-App kann sie technische Dateien im Browser-Cache
        speichern, damit die Anwendung schneller lädt und auf geeigneten Geräten
        zum Homescreen hinzugefügt werden kann. Diese technische Speicherung
        dient der Bereitstellung der App-Funktion und erfolgt auf Grundlage von
        Art. 6 Abs. 1 lit. f DSGVO.
      </p>

      <p className="legal-meta">
        Grundlage: angepasst aus dem bestehenden eRecht24-Text.
      </p>
    </article>
  );
}
