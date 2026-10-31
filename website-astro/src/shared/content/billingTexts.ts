// Zentrale Texte fuer Checkout, Erfolgsseite und Preis-Fussnoten.
//
// Alle sichtbaren Texte der aus TraderScope uebernommenen Seiten stehen hier
// an einer Stelle, damit sie spaeter in einem Rutsch auf LifeFlow360 /
// FitFlow360 / Eqology zugeschnitten werden koennen. Platzhalter sind
// bewusst schlicht gehalten ("Pro", Markenname aus brand.yaml).
//
// Rechtlich relevante Texte (Widerrufsverzicht, B2B-Bestaetigung,
// Pflichtangaben) muessen vor dem Livegang juristisch geprueft werden.

import type { Brand } from '@shared/content-schemas/config';

export interface BillingTexts {
  pricing: {
    breadcrumbHome: string;
    breadcrumbCurrent: string;
    legalLinksHtml: string;
    footnoteHtml: string[];
    standLabel: string;
  };
  checkout: {
    seoTitle: (planName: string) => string;
    seoDescription: (planName: string) => string;
    heroTitleHtml: string;
    heroLead: string;
    formTitle: string;
    stepLabels: [string, string];
    step1Intro: string;
    step2Intro: string;
    buyerTypeLegend: string;
    consumerLabel: string;
    businessLabel: string;
    consumerNameLabel: string;
    consumerNameHint: string;
    businessNameLabel: string;
    businessNameHint: string;
    emailHint: string;
    vatHint: string;
    submitLabel: (planName: string, grossLabel: string) => string;
    paddleFooterHtml: string;
    b2bConfirmationLabel: string;
    withdrawalLabel: string;
    withdrawalHintHtml: string;
  };
  success: {
    seoTitle: string;
    pendingTitle: string;
    pendingText: string;
    readyTitle: string;
    readyText: string;
    readyCta: string;
    errorTitle: string;
    errorTextHtml: string;
  };
}

export function billingTexts(brand: Brand): BillingTexts {
  const product = brand.siteName;
  return {
    pricing: {
      breadcrumbHome: 'Start',
      breadcrumbCurrent: 'Preise',
      legalLinksHtml:
        'Es gelten die <a href="/agb.html">AGB</a>. Verbraucher haben 14 Tage Widerrufsrecht &ndash; Details in der <a href="/widerruf.html">Widerrufsbelehrung</a>.',
      footnoteHtml: [
        'Alle Preise je Abrechnungsperiode. Brutto = netto zzgl. gesetzlicher USt. (Deutschland 19&nbsp;%). Bei gültiger EU-USt-IdNr. außerhalb Deutschlands entfällt die deutsche USt. (Reverse-Charge, Prüfung über Paddle).',
        'Nach der Mindestlaufzeit verlängert sich das Abo automatisch um die gewählte Laufzeit und ist zum Ende der Laufzeit kündbar. Zahlung und Rechnung über Paddle als Merchant of Record.',
      ],
      standLabel: 'Stand der Preise',
    },
    checkout: {
      seoTitle: (planName) => `Bezahlung · ${product} ${planName}`,
      seoDescription: (planName) => `${product} ${planName} sicher per Paddle bezahlen.`,
      heroTitleHtml: 'Pro <em>freischalten</em>',
      heroLead:
        'Rechnungsdaten eingeben, sicher über Paddle zahlen, sofort loslegen. Automatische Verlängerung; Kündigung jederzeit zum Ende der Laufzeit.',
      formTitle: 'Bezahlung abschließen',
      stepLabels: ['Rechnungsdaten', 'Zahlung'],
      step1Intro: 'Gib deine vollständigen Rechnungsdaten ein. Sie erscheinen auf deiner Paddle-Rechnung.',
      step2Intro: 'Schließe die Zahlung im sicheren Paddle-Feld ab.',
      buyerTypeLegend: 'Ich kaufe als',
      consumerLabel: 'Privatperson',
      businessLabel: 'Unternehmen / Selbstständige',
      consumerNameLabel: 'Vor- und Nachname',
      consumerNameHint: 'Erscheint so auf der Rechnung.',
      businessNameLabel: 'Firma',
      businessNameHint: 'Erscheint so auf der Rechnung. Einzelunternehmer: Vor- und Nachname.',
      emailHint: 'Für Rechnung, Zugang und Login.',
      vatHint:
        'Bei gültiger EU-USt-IdNr. außerhalb DE entfällt die deutsche USt. (Reverse-Charge). Paddle prüft über VIES.',
      submitLabel: (planName, grossLabel) => `${planName} für ${grossLabel} zahlungspflichtig bestellen`,
      paddleFooterHtml:
        'Abwicklung und Rechnungsstellung durch <a href="https://paddle.com" rel="noopener" target="_blank">Paddle.com</a>.<br />Automatische Verlängerung um die gewählte Laufzeit.',
      b2bConfirmationLabel:
        'Ich bestätige, dass ich als Unternehmer (§ 14 BGB) handle und den Zugang ausschließlich gewerblich oder selbstständig beruflich nutze.',
      withdrawalLabel:
        'Ich verlange ausdrücklich, dass mein Zugang sofort – vor Ablauf der Widerrufsfrist – bereitgestellt wird. Mir ist bekannt, dass ich im Fall des Widerrufs einen anteiligen Wertersatz für die bis dahin erbrachte Leistung zahle (§ 357a Abs. 2 BGB).',
      withdrawalHintHtml:
        'Details siehe <a href="/widerruf.html" target="_blank">Widerrufsbelehrung</a>.',
    },
    success: {
      seoTitle: `Zahlung abgeschlossen · ${product}`,
      pendingTitle: 'Zahlung erhalten – dein Zugang wird eingerichtet',
      pendingText: 'Das dauert meist nur wenige Sekunden. Bitte diese Seite geöffnet lassen.',
      readyTitle: 'Dein Pro-Zugang ist aktiv',
      readyText: `Vielen Dank! Du kannst ${product} jetzt mit vollem Funktionsumfang nutzen.`,
      readyCta: 'Zur App',
      errorTitle: 'Zugang noch nicht bestätigt',
      errorTextHtml:
        'Deine Zahlung ist bei uns eingegangen, die Freischaltung dauert aber länger als üblich. Melde dich in wenigen Minuten mit deinem Login-Code an – falls es dann nicht klappt, schreib uns über die Kontaktangaben im <a href="/impressum.html">Impressum</a>.',
    },
  };
}
