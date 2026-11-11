/**
 * Erklärseiten „So funktioniert Politik“ – statische Inhalte, offline verfügbar.
 *
 * Regeln für diese Texte:
 * - eigene Formulierungen (keine Texte von bpb, bundestag.de o. Ä. übernehmen)
 * - einfache Sprache: kurze Sätze, Fachwörter erklärt
 * - streng parteineutral: keine Parteinamen, keine Wertungen
 * - je Thema 150–350 Wörter, 1–3 Links (nur https) zum Weiterlesen
 * - Fakten nur, wenn sie sicher sind; Stand unten in EXPLAIN_STAND pflegen
 */

/** Stabile Themen-IDs. Nicht umbenennen – sie werden in Links verwendet (/erklaert/<id>). */
export const EXPLAIN_TOPIC_IDS = [
  'bundestag',
  'gesetzgebung',
  'beratungsstand',
  'wahl',
  'wahlrecht-2023',
  'fraktion',
  'abstimmung',
  'regierung',
  'bundesrat',
  'drucksache',
  'datenquellen',
] as const;

export type ExplainTopicId = (typeof EXPLAIN_TOPIC_IDS)[number];

/** Stand der Fakten in allen Erklärtexten. */
export const EXPLAIN_STAND = 'Oktober 2026';

export type ExplainItem = {
  /** Fachbegriff oder Station, wird hervorgehoben. */
  term?: string;
  text: string;
};

export type ExplainSection = {
  heading: string;
  paragraphs?: string[];
  items?: ExplainItem[];
  /** Nummerierte Liste (z. B. Stationen eines Gesetzes) statt Aufzählung. */
  ordered?: boolean;
};

export type ExplainSource = { label: string; url: string };

export type ExplainTopic = {
  id: ExplainTopicId;
  /** Überschrift der Seite und Eintrag in der Übersicht. */
  title: string;
  /** Kurzer Titel für die Kopfzeile. */
  shortTitle: string;
  /** Ein Satz für die Übersicht. */
  summary: string;
  sections: ExplainSection[];
  related: ExplainTopicId[];
  sources: ExplainSource[];
};

export const EXPLAIN_TOPICS: readonly ExplainTopic[] = [
  {
    id: 'bundestag',
    title: 'Was macht der Bundestag?',
    shortTitle: 'Bundestag',
    summary: 'Das Parlament für ganz Deutschland und seine Aufgaben.',
    sections: [
      {
        heading: 'Wer im Bundestag sitzt',
        paragraphs: [
          'Der Bundestag ist das Parlament für ganz Deutschland. Seine Mitglieder heißen Abgeordnete. Die Wahlberechtigten wählen sie bei der Bundestagswahl.',
          'Seit der Wahl 2025 hat der Bundestag 630 Sitze. Eine Wahlperiode dauert in der Regel vier Jahre. Danach wird neu gewählt.',
        ],
      },
      {
        heading: 'Die wichtigsten Aufgaben',
        items: [
          { term: 'Gesetze', text: 'Der Bundestag beschließt neue Gesetze und ändert bestehende.' },
          {
            term: 'Haushalt',
            text: 'Er beschließt den Haushalt. Das ist der Plan, wofür der Bund Geld ausgibt.',
          },
          {
            term: 'Wahl',
            text: 'Er wählt die Bundeskanzlerin oder den Bundeskanzler.',
          },
          {
            term: 'Kontrolle',
            text: 'Er kontrolliert die Bundesregierung. Abgeordnete stellen Fragen, und die Regierung muss antworten.',
          },
          {
            term: 'Bundeswehr',
            text: 'Er entscheidet, ob die Bundeswehr bewaffnet im Ausland eingesetzt wird.',
          },
        ],
      },
      {
        heading: 'Wo die Arbeit stattfindet',
        paragraphs: [
          'Die Sitzungen aller Abgeordneten heißen Plenarsitzungen. Sie sind öffentlich. Man kann sie live im Internet ansehen.',
          'Viel Arbeit passiert vorher in den Ausschüssen. Ein Ausschuss ist eine kleinere Gruppe von Abgeordneten für ein Fachgebiet, zum Beispiel Gesundheit oder Verkehr.',
        ],
      },
      {
        heading: 'Frei in der Entscheidung',
        paragraphs: [
          'Laut Grundgesetz vertreten die Abgeordneten das ganze Volk. Sie sind an Aufträge und Weisungen nicht gebunden. Sie entscheiden nach ihrem Gewissen.',
        ],
      },
    ],
    related: ['wahl', 'gesetzgebung', 'fraktion', 'regierung'],
    sources: [
      { label: 'Deutscher Bundestag – Aufgaben', url: 'https://www.bundestag.de/parlament/aufgaben' },
      {
        label: 'Grundgesetz, Artikel 38 (gesetze-im-internet.de)',
        url: 'https://www.gesetze-im-internet.de/gg/art_38.html',
      },
    ],
  },
  {
    id: 'gesetzgebung',
    title: 'Wie entsteht ein Gesetz?',
    shortTitle: 'Gesetzgebung',
    summary: 'Die Stationen vom Entwurf bis zur Veröffentlichung.',
    sections: [
      {
        heading: 'Der Anfang: ein Entwurf',
        paragraphs: [
          'Ein Gesetz beginnt mit einem Gesetzentwurf. Das ist ein Vorschlag für den Text. Einen Entwurf einbringen dürfen die Bundesregierung, der Bundesrat oder Abgeordnete des Bundestags. Bei Abgeordneten muss es eine Fraktion sein oder mindestens fünf Prozent aller Abgeordneten.',
        ],
      },
      {
        heading: 'Die Stationen',
        paragraphs: ['So läuft es bei einem Entwurf der Bundesregierung:'],
        ordered: true,
        items: [
          { term: 'Kabinett', text: 'Die Bundesregierung beschließt den Entwurf gemeinsam.' },
          {
            term: 'Bundesrat, 1. Durchgang',
            text: 'Der Bundesrat bekommt den Entwurf zuerst und kann dazu Stellung nehmen.',
          },
          {
            term: '1. Lesung',
            text: 'Der Bundestag berät den Entwurf zum ersten Mal. „Lesung“ heißt Beratung im Plenum. Danach gibt er den Entwurf an Ausschüsse.',
          },
          {
            term: 'Ausschüsse',
            text: 'Fachleute aus den Fraktionen prüfen den Text genau. Oft befragen sie Sachverständige. Am Ende steht eine Beschlussempfehlung.',
          },
          {
            term: '2. Lesung',
            text: 'Der Bundestag berät erneut. Abgeordnete können Änderungen beantragen.',
          },
          {
            term: '3. Lesung',
            text: 'Der Bundestag stimmt über das ganze Gesetz ab. Sie folgt meist direkt auf die 2. Lesung.',
          },
          {
            term: 'Bundesrat',
            text: 'Der Bundesrat berät das beschlossene Gesetz.',
          },
          {
            term: 'Ausfertigung und Verkündung',
            text: 'Die Bundesregierung unterschreibt mit. Dann unterschreibt die Bundespräsidentin oder der Bundespräsident. Zum Schluss wird das Gesetz im Bundesgesetzblatt veröffentlicht.',
          },
        ],
      },
      {
        heading: 'Einspruchsgesetz und Zustimmungsgesetz',
        paragraphs: [
          'Bei den meisten Gesetzen kann der Bundesrat nur Einspruch einlegen. Vorher ruft er den Vermittlungsausschuss an. Dort suchen Mitglieder von Bundestag und Bundesrat einen Kompromiss. Den Einspruch kann der Bundestag mit einer bestimmten Mehrheit zurückweisen. Das ist ein Einspruchsgesetz.',
          'Manche Gesetze brauchen die Zustimmung des Bundesrats. Welche das sind, legt das Grundgesetz fest. Oft geht es um Geld oder Aufgaben der Länder. Ohne Zustimmung kommt ein solches Zustimmungsgesetz nicht zustande.',
        ],
      },
    ],
    related: ['beratungsstand', 'bundesrat', 'drucksache', 'abstimmung'],
    sources: [
      {
        label: 'Deutscher Bundestag – Gesetzgebung',
        url: 'https://www.bundestag.de/parlament/aufgaben/gesetzgebung_neu',
      },
      {
        label: 'Bundesrat – Gesetzgebung',
        url: 'https://www.bundesrat.de/DE/aufgaben/gesetzgebung/gesetzgebung-node.html',
      },
    ],
  },
  {
    id: 'beratungsstand',
    title: 'Was bedeutet der Beratungsstand?',
    shortTitle: 'Beratungsstand',
    summary: 'Wie weit ein Gesetzentwurf gerade ist – und was die Angaben heißen.',
    sections: [
      {
        heading: 'Ein amtlicher Zwischenstand',
        paragraphs: [
          'Ein Gesetzentwurf durchläuft viele Stationen. Der Beratungsstand sagt, wie weit er gerade ist. Die Angabe stammt aus der Datenbank DIP von Bundestag und Bundesrat. Die App zeigt sie so an, wie sie dort steht.',
        ],
      },
      {
        heading: 'Häufige Angaben',
        items: [
          {
            term: 'Dem Bundesrat zugeleitet – Noch nicht beraten',
            text: 'Der Bundesrat hat den Entwurf bekommen, aber noch nicht darüber beraten.',
          },
          {
            term: 'Überwiesen',
            text: 'Der Bundestag hat den Entwurf an einen oder mehrere Ausschüsse gegeben.',
          },
          {
            term: 'Beschlussempfehlung liegt vor',
            text: 'Der zuständige Ausschuss ist fertig und empfiehlt dem Bundestag, wie er entscheiden soll.',
          },
          {
            term: 'Verabschiedet',
            text: 'Der Bundestag hat das Gesetz beschlossen. Weitere Schritte, etwa im Bundesrat, können noch fehlen.',
          },
          {
            term: 'Verkündet',
            text: 'Das Gesetz ist im Bundesgesetzblatt veröffentlicht.',
          },
          {
            term: 'Abgelehnt',
            text: 'Eine Mehrheit hat gegen den Entwurf gestimmt.',
          },
          {
            term: 'Erledigt durch Ablauf der Wahlperiode',
            text: 'Der Entwurf war bis zum Ende der Wahlperiode nicht fertig beraten. Er ist damit erledigt. Er kann später neu eingebracht werden.',
          },
        ],
      },
      {
        heading: 'Wichtig zu wissen',
        paragraphs: [
          'Der Beratungsstand sagt nichts darüber, ob ein Vorschlag gut oder schlecht ist. Ein Entwurf kann auch lange auf einer Station bleiben. Die Gründe dafür stehen nicht in den Daten.',
        ],
      },
    ],
    related: ['gesetzgebung', 'drucksache'],
    sources: [
      { label: 'DIP – Dokumentations- und Informationssystem', url: 'https://dip.bundestag.de/' },
      {
        label: 'Deutscher Bundestag – Gesetzgebung',
        url: 'https://www.bundestag.de/parlament/aufgaben/gesetzgebung_neu',
      },
    ],
  },
  {
    id: 'wahl',
    title: 'Erststimme, Zweitstimme und Mandat',
    shortTitle: 'Wahl und Mandat',
    summary: 'Wie man in den Bundestag kommt: direkt, über die Liste oder durch Nachrücken.',
    sections: [
      {
        heading: 'Zwei Stimmen',
        paragraphs: [
          'Bei der Bundestagswahl hat man zwei Stimmen.',
          'Mit der Erststimme wählt man eine Person im eigenen Wahlkreis. Deutschland ist in 299 Wahlkreise eingeteilt.',
          'Mit der Zweitstimme wählt man die Landesliste einer Partei. Eine Landesliste ist eine Reihenfolge von Personen, die eine Partei in einem Bundesland aufstellt.',
        ],
      },
      {
        heading: 'Die Zweitstimme verteilt die Sitze',
        paragraphs: [
          'Die Zweitstimmen bestimmen, wie viele Sitze jede Partei bekommt. Dafür braucht eine Partei in der Regel mindestens fünf Prozent der Zweitstimmen. Das heißt Fünf-Prozent-Hürde.',
          'Es gibt eine Ausnahme: Gewinnt eine Partei mindestens drei Wahlkreise, bekommt sie Sitze nach ihrem Zweitstimmen-Anteil, auch unter fünf Prozent. Das heißt Grundmandatsklausel.',
        ],
      },
      {
        heading: 'Direktmandat und Listenmandat',
        paragraphs: [
          'Ein Mandat ist der Auftrag, im Parlament mitzuarbeiten.',
          'Wer über einen Wahlkreis in den Bundestag kommt, hat ein Direktmandat. Wer über eine Landesliste kommt, hat ein Listenmandat. Im Bundestag haben beide die gleichen Rechte.',
          'Viele Menschen kandidieren in einem Wahlkreis und stehen zugleich auf einer Landesliste. Deshalb kann eine Person aus deinem Wahlkreis im Bundestag sitzen, auch wenn sie den Wahlkreis nicht gewonnen hat.',
        ],
      },
      {
        heading: 'Nachrücken',
        paragraphs: [
          'Verlässt eine Person den Bundestag, bleibt ihr Sitz nicht leer. In der Regel rückt die nächste Person auf der Landesliste derselben Partei nach. In der App steht dann „Nachgerückt“.',
        ],
      },
    ],
    related: ['wahlrecht-2023', 'bundestag', 'fraktion'],
    sources: [
      {
        label: 'Die Bundeswahlleiterin – Bundestagswahl 2025',
        url: 'https://www.bundeswahlleiterin.de/bundestagswahlen/2025.html',
      },
      { label: 'Deutscher Bundestag – Wahlen', url: 'https://www.bundestag.de/parlament/wahlen' },
    ],
  },
  {
    id: 'wahlrecht-2023',
    title: 'Die Wahlrechtsreform 2023',
    shortTitle: 'Wahlrechtsreform',
    summary: 'Warum manche Wahlkreise niemanden mit Direktmandat im Bundestag haben.',
    sections: [
      {
        heading: 'Was sich geändert hat',
        paragraphs: [
          'Der Bundestag hat 2023 das Wahlrecht geändert. Die neuen Regeln galten zum ersten Mal bei der Bundestagswahl 2025.',
          'Früher konnte der Bundestag durch zusätzliche Sitze größer werden. Diese hießen Überhangmandate und Ausgleichsmandate. Es gibt sie nicht mehr. Seit der Reform hat der Bundestag eine feste Größe von 630 Sitzen.',
        ],
      },
      {
        heading: 'Wahlkreis gewonnen, aber kein Sitz',
        paragraphs: [
          'Eine Partei bekommt höchstens so viele Sitze, wie ihr nach den Zweitstimmen zustehen. Das nennt man Zweitstimmendeckung.',
          'Manchmal gewinnt eine Partei in einem Land mehr Wahlkreise, als ihr dort Sitze zustehen. Dann bekommen die Wahlkreis-Gewinnerinnen und -Gewinner mit dem geringsten Anteil an Erststimmen keinen Sitz.',
          'Diese Wahlkreise haben dann niemanden mit Direktmandat im Bundestag. Die App zeigt das beim jeweiligen Wahlkreis an. Oft sitzen trotzdem Personen aus dem Wahlkreis im Bundestag, die über eine Landesliste gewählt wurden.',
        ],
      },
      {
        heading: 'Das Urteil von 2024',
        paragraphs: [
          'Das Bundesverfassungsgericht hat die Reform im Juli 2024 geprüft. Ergebnis: Die Zweitstimmendeckung ist mit dem Grundgesetz vereinbar.',
          'Die Reform hatte auch die Grundmandatsklausel gestrichen. Allein mit der Fünf-Prozent-Hürde ist das Gesetz laut Urteil derzeit nicht mit dem Grundgesetz vereinbar. Bis zu einer neuen Regel gilt deshalb: Eine Partei bekommt auch unter fünf Prozent Sitze, wenn sie mindestens drei Wahlkreise gewinnt.',
        ],
      },
    ],
    related: ['wahl', 'bundestag'],
    sources: [
      {
        label: 'Bundesverfassungsgericht – Pressemitteilung zum Urteil vom 30. Juli 2024',
        url: 'https://www.bundesverfassungsgericht.de/SharedDocs/Pressemitteilungen/DE/2024/bvg24-064.html',
      },
      {
        label: 'Die Bundeswahlleiterin – Bundestagswahl 2025',
        url: 'https://www.bundeswahlleiterin.de/bundestagswahlen/2025.html',
      },
    ],
  },
  {
    id: 'fraktion',
    title: 'Fraktion und fraktionslos',
    shortTitle: 'Fraktion',
    summary: 'Wie sich Abgeordnete zusammenschließen – und was für Einzelne gilt.',
    sections: [
      {
        heading: 'Was ist eine Fraktion?',
        paragraphs: [
          'Eine Fraktion ist ein Zusammenschluss von Abgeordneten im Bundestag. Meist gehören sie derselben Partei an. Auch Parteien, die in keinem Bundesland gegeneinander antreten, können eine gemeinsame Fraktion bilden.',
          'Eine Fraktion braucht mindestens fünf Prozent aller Abgeordneten. Kleinere Zusammenschlüsse kann der Bundestag als Gruppe anerkennen. Eine Gruppe hat weniger Rechte als eine Fraktion.',
        ],
      },
      {
        heading: 'Was Fraktionen tun',
        paragraphs: [
          'Fraktionen organisieren die Arbeit im Bundestag. Nach ihrer Größe richten sich zum Beispiel die Redezeit und die Zahl der Plätze in den Ausschüssen.',
          'Fraktionen dürfen Gesetzentwürfe und Anträge einbringen. Sie können auch eine namentliche Abstimmung verlangen.',
          'Oft stimmt eine Fraktion einheitlich ab. Eine Pflicht dazu gibt es nicht. Jede und jeder Abgeordnete entscheidet frei.',
        ],
      },
      {
        heading: 'Fraktionslos',
        paragraphs: [
          'Fraktionslos ist, wer im Bundestag keiner Fraktion angehört. Das kann zum Beispiel passieren, wenn jemand eine Fraktion verlässt.',
          'Fraktionslose Abgeordnete behalten ihr Mandat. Sie dürfen im Plenum abstimmen, reden und der Regierung Fragen stellen. In einem Ausschuss dürfen sie mitberaten, aber nicht mitstimmen.',
        ],
      },
    ],
    related: ['bundestag', 'abstimmung', 'wahl'],
    sources: [
      {
        label: 'Deutscher Bundestag – Fraktionen',
        url: 'https://www.bundestag.de/parlament/fraktionen',
      },
    ],
  },
  {
    id: 'abstimmung',
    title: 'Namentliche Abstimmung und Handzeichen',
    shortTitle: 'Abstimmungen',
    summary: 'Warum es nur bei wenigen Abstimmungen Einzelstimmen gibt.',
    sections: [
      {
        heading: 'So stimmt der Bundestag meistens ab',
        paragraphs: [
          'Meistens stimmt der Bundestag per Handzeichen ab. Oder die Abgeordneten stehen auf oder bleiben sitzen. Das Präsidium des Bundestags stellt dann fest, welche Seite die Mehrheit hat. Dabei wird nicht aufgeschrieben, wie jede einzelne Person abgestimmt hat.',
          'Ist das Ergebnis unklar, wird gezählt. Alle verlassen den Saal und kommen durch eine von drei Türen zurück: für Ja, Nein oder Enthaltung. Das heißt Hammelsprung.',
        ],
      },
      {
        heading: 'Namentliche Abstimmung',
        paragraphs: [
          'Bei einer namentlichen Abstimmung gibt jede und jeder Abgeordnete eine Stimmkarte mit dem eigenen Namen ab. Danach wird veröffentlicht, wie jede Person gestimmt hat.',
          'Eine namentliche Abstimmung gibt es, wenn eine Fraktion oder fünf Prozent der Abgeordneten sie verlangen.',
        ],
      },
      {
        heading: 'Warum es nur wenige Einzelstimmen gibt',
        paragraphs: [
          'Namentliche Abstimmungen dauern länger. Sie sind deshalb nur ein kleiner Teil aller Abstimmungen. Für die übrigen gibt es keine amtlichen Angaben zu einzelnen Abgeordneten.',
          'Die App zeigt Einzelstimmen deshalb nur bei namentlichen Abstimmungen. Fehlt eine Abstimmung in der App, kann sie trotzdem stattgefunden haben.',
        ],
      },
      {
        heading: 'Was „Nicht abgegeben“ heißt',
        paragraphs: [
          'Für diese Person ist bei der Abstimmung keine Stimme verzeichnet. Dafür gibt es viele mögliche Gründe, zum Beispiel Krankheit oder andere Termine. Die Gründe stehen nicht in den Daten.',
        ],
      },
      {
        heading: 'Geheime Wahlen',
        paragraphs: [
          'Wenn der Bundestag Personen wählt, zum Beispiel die Bundeskanzlerin oder den Bundeskanzler, ist die Wahl geheim.',
        ],
      },
    ],
    related: ['fraktion', 'drucksache', 'bundestag'],
    sources: [
      {
        label: 'Deutscher Bundestag – Namenslisten der Abstimmungen',
        url: 'https://www.bundestag.de/parlament/plenum/abstimmung/liste',
      },
    ],
  },
  {
    id: 'regierung',
    title: 'Bundesregierung, Kanzler und Kabinett',
    shortTitle: 'Bundesregierung',
    summary: 'Wer regiert, wie die Regierung ins Amt kommt und wer was entscheidet.',
    sections: [
      {
        heading: 'Wer zur Bundesregierung gehört',
        paragraphs: [
          'Die Bundesregierung besteht aus der Bundeskanzlerin oder dem Bundeskanzler und den Bundesministerinnen und Bundesministern. Zusammen heißen sie Kabinett. Das Kabinett trifft sich regelmäßig und fasst gemeinsam Beschlüsse.',
        ],
      },
      {
        heading: 'Wie die Regierung ins Amt kommt',
        paragraphs: [
          'Der Bundestag wählt die Kanzlerin oder den Kanzler. Im ersten Wahlgang ist gewählt, wer die Stimmen von mehr als der Hälfte aller Abgeordneten bekommt.',
          'Die Ministerinnen und Minister schlägt die Kanzlerin oder der Kanzler vor. Ernannt werden sie von der Bundespräsidentin oder dem Bundespräsidenten.',
        ],
      },
      {
        heading: 'Wer was entscheidet',
        items: [
          {
            term: 'Richtlinienkompetenz',
            text: 'Die Kanzlerin oder der Kanzler bestimmt die großen Linien der Politik und trägt dafür die Verantwortung.',
          },
          {
            term: 'Ressortprinzip',
            text: 'Ein Ressort ist ein Ministerium mit seinem Aufgabengebiet, zum Beispiel Finanzen. Innerhalb der großen Linien leitet jede Ministerin und jeder Minister das eigene Ressort selbstständig.',
          },
          {
            term: 'Kollegialprinzip',
            text: 'Sind sich Ministerien nicht einig, entscheidet die Bundesregierung gemeinsam.',
          },
        ],
      },
      {
        heading: 'Kontrolle durch den Bundestag',
        paragraphs: [
          'Der Bundestag kontrolliert die Regierung. Er kann die Kanzlerin oder den Kanzler abwählen. Das geht aber nur, wenn er gleichzeitig mit Mehrheit eine Nachfolge wählt. Das heißt konstruktives Misstrauensvotum.',
        ],
      },
    ],
    related: ['bundestag', 'gesetzgebung', 'bundesrat'],
    sources: [
      {
        label: 'Die Bundesregierung – Bundeskabinett',
        url: 'https://www.bundesregierung.de/breg-de/bundesregierung/bundeskabinett',
      },
      {
        label: 'Grundgesetz, Artikel 65 (gesetze-im-internet.de)',
        url: 'https://www.gesetze-im-internet.de/gg/art_65.html',
      },
    ],
  },
  {
    id: 'bundesrat',
    title: 'Bundesrat und Länder',
    shortTitle: 'Bundesrat',
    summary: 'Wie die 16 Länder bei der Politik des Bundes mitwirken.',
    sections: [
      {
        heading: 'Deutschland ist ein Bundesstaat',
        paragraphs: [
          'Deutschland besteht aus 16 Ländern. Jedes Land hat ein eigenes Parlament und eine eigene Regierung. Das Parlament heißt meist Landtag, in Berlin Abgeordnetenhaus, in Bremen und Hamburg Bürgerschaft.',
          'Die Länder sind zum Beispiel für Schulen und Polizei zuständig. Viele Bundesgesetze werden von den Ländern ausgeführt.',
        ],
      },
      {
        heading: 'Was ist der Bundesrat?',
        paragraphs: [
          'Über den Bundesrat wirken die Länder bei Gesetzen und bei der Verwaltung des Bundes mit. Das gilt auch für Angelegenheiten der Europäischen Union.',
          'Der Bundesrat wird nicht direkt gewählt. Seine Mitglieder kommen aus den Landesregierungen. Nach einer Landtagswahl kann sich deshalb auch der Bundesrat verändern.',
        ],
      },
      {
        heading: 'Die Stimmen der Länder',
        paragraphs: [
          'Der Bundesrat hat 69 Stimmen. Jedes Land hat je nach Einwohnerzahl drei bis sechs Stimmen. Ein Land muss seine Stimmen einheitlich abgeben.',
          'Die Präsidentschaft im Bundesrat wechselt jedes Jahr zu einem anderen Land.',
        ],
      },
      {
        heading: 'Rolle bei Gesetzen',
        paragraphs: [
          'Der Bundesrat kann eigene Gesetzentwürfe einbringen. Er berät jedes Gesetz, das der Bundestag beschließt. Bei Zustimmungsgesetzen ist seine Zustimmung nötig. Bei Einspruchsgesetzen kann er Einspruch einlegen.',
        ],
      },
    ],
    related: ['gesetzgebung', 'regierung', 'bundestag'],
    sources: [
      {
        label: 'Bundesrat – Aufgaben',
        url: 'https://www.bundesrat.de/DE/aufgaben/aufgaben-node.html',
      },
      {
        label: 'Bundesrat – Zusammensetzung und Stimmen',
        url: 'https://www.bundesrat.de/DE/bundesrat/verteilung/verteilung-node.html',
      },
    ],
  },
  {
    id: 'drucksache',
    title: 'Drucksache und Plenarprotokoll',
    shortTitle: 'Drucksache',
    summary: 'Die amtlichen Dokumente des Bundestags – und wie man ihre Nummern liest.',
    sections: [
      {
        heading: 'Drucksache',
        paragraphs: [
          'Eine Drucksache ist ein amtliches Dokument des Bundestags. Dazu gehören zum Beispiel Gesetzentwürfe, Anträge, Anfragen an die Bundesregierung und ihre Antworten. Auch die Beschlussempfehlungen der Ausschüsse sind Drucksachen.',
          'Jede Drucksache hat eine Nummer, zum Beispiel 21/1234. Die erste Zahl ist die Wahlperiode. Die zweite Zahl ist eine laufende Nummer. Auch der Bundesrat hat eigene Drucksachen.',
        ],
      },
      {
        heading: 'Anfragen',
        paragraphs: [
          'Mit einer Kleinen oder Großen Anfrage stellen Abgeordnete der Bundesregierung Fragen. Die Regierung antwortet schriftlich. Fragen und Antworten werden als Drucksachen veröffentlicht.',
        ],
      },
      {
        heading: 'Plenarprotokoll',
        paragraphs: [
          'Ein Plenarprotokoll ist die wörtliche Mitschrift einer Sitzung des Bundestags. Es hält alle Reden fest, auch Zwischenrufe, und die Ergebnisse der Abstimmungen.',
          'Auch das Protokoll hat eine Nummer. 21/15 heißt: 21. Wahlperiode, 15. Sitzung.',
        ],
      },
      {
        heading: 'Wo man die Dokumente findet',
        paragraphs: [
          'Drucksachen und Plenarprotokolle sind öffentlich und kostenlos. Man findet sie im DIP. Das ist das Dokumentations- und Informationssystem von Bundestag und Bundesrat. Die App verlinkt auf die Originale.',
        ],
      },
    ],
    related: ['gesetzgebung', 'beratungsstand', 'datenquellen'],
    sources: [
      { label: 'DIP – Dokumentations- und Informationssystem', url: 'https://dip.bundestag.de/' },
      { label: 'Deutscher Bundestag – Dokumente', url: 'https://www.bundestag.de/dokumente' },
    ],
  },
  {
    id: 'datenquellen',
    title: 'Woher kommen die Daten in dieser App?',
    shortTitle: 'Datenquellen',
    summary: 'Die Quellen der App, ihre Lizenzen und die Grenzen der Daten.',
    sections: [
      {
        heading: 'Nur öffentliche Quellen',
        paragraphs: [
          'Die App zeigt nur Angaben aus offiziellen und öffentlichen Quellen. Bei jeder Angabe stehen die Quelle, die Lizenz und der Zeitpunkt des Abrufs. Die App bewertet nicht und erstellt keine Ranglisten.',
          'Eine Lizenz regelt, wie man Daten nutzen darf.',
        ],
      },
      {
        heading: 'Die Quellen',
        items: [
          {
            term: 'abgeordnetenwatch.de',
            text: 'Abgeordnete, Mandate, Kandidaturen und namentliche Abstimmungen. Lizenz CC0: Die Daten dürfen frei genutzt werden.',
          },
          {
            term: 'DIP von Bundestag und Bundesrat',
            text: 'Gesetzgebung, Drucksachen, Plenarprotokolle und Aktivitäten wie Reden. Nutzung frei mit Angabe der Quelle.',
          },
          {
            term: 'Wikidata',
            text: 'Eine freie Wissensdatenbank. Daraus kommt, wer der Bundesregierung angehört – die Kanzlerin oder der Kanzler und alle Ministerinnen und Minister – und seit wann. Diese Angaben sind als Datei in der App enthalten und werden mit Updates der App aktualisiert. Die App fragt Wikidata nicht selbst ab. Bei den Angaben steht deshalb „Stand“ statt „abgerufen am“. Ministerinnen und Minister zeigen wir nur an, wenn die Parlamentsdokumentation DIP das Amt für dieselbe Person bestätigt. Diese Prüfung geschieht live. Lizenz CC0.',
          },
          {
            term: 'Die Bundeswahlleiterin',
            text: 'Die amtlichen Grenzen der Wahlkreise. Datenlizenz Deutschland – Namensnennung 2.0.',
          },
          {
            term: 'OpenStreetMap',
            text: 'Die Gebiete der Postleitzahlen. Lizenz ODbL, © OpenStreetMap-Mitwirkende.',
          },
        ],
      },
      {
        heading: 'Postleitzahl und Wahlkreis',
        paragraphs: [
          'Es gibt keine amtliche Zuordnung von Postleitzahlen zu Wahlkreisen. Die App legt deshalb die Gebiete der Postleitzahlen über die Grenzen der Wahlkreise. An den Grenzen sind Fehler möglich. Verbindlich ist der Wahlkreis auf deiner Wahlbenachrichtigung.',
        ],
      },
    ],
    related: ['drucksache', 'abstimmung', 'wahl'],
    sources: [
      {
        label: 'abgeordnetenwatch.de – Datenschnittstelle',
        url: 'https://www.abgeordnetenwatch.de/api',
      },
      { label: 'DIP – Dokumentations- und Informationssystem', url: 'https://dip.bundestag.de/' },
      {
        label: 'Die Bundeswahlleiterin – Wahlkreiseinteilung',
        url: 'https://www.bundeswahlleiterin.de/bundestagswahlen/2025/wahlkreiseinteilung/downloads.html',
      },
    ],
  },
];

/** Thema zu einer ID; `undefined`, wenn es die ID nicht gibt (z. B. falscher Link). */
export function getExplainTopic(id: string | undefined): ExplainTopic | undefined {
  return EXPLAIN_TOPICS.find((t) => t.id === id);
}

export function isExplainTopicId(id: string | undefined): id is ExplainTopicId {
  return (EXPLAIN_TOPIC_IDS as readonly string[]).includes(id ?? '');
}

/** Alle Wörter eines Themas (Überschriften, Absätze, Listen) – für die Längenprüfung. */
export function countWords(topic: ExplainTopic): number {
  const texts = [
    topic.title,
    ...topic.sections.flatMap((s) => [
      s.heading,
      ...(s.paragraphs ?? []),
      ...(s.items ?? []).flatMap((i) => [i.term ?? '', i.text]),
    ]),
  ];
  return texts
    .join(' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
