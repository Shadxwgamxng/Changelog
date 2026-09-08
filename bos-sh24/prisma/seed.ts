import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import slugify from "slugify";

const prisma = new PrismaClient();

function slug(input: string) {
  return slugify(input, { lower: true, strict: true, locale: "de" });
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const DEMO_PASSWORD = "Passwort123!";

async function main() {
  console.log("Seeding BOS_SH24 Datenbank …");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ---------- Website-Einstellungen ----------
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: "BOS_SH24",
      tagline: "Presseagentur für Blaulicht- und Einsatzberichte",
      description:
        "BOS_SH24 berichtet unabhängig und aktuell über Einsätze, Pressemitteilungen und Veranstaltungen von Feuerwehr, Rettungsdienst und Polizei in Schleswig-Holstein.",
      logoUrl: null,
      contactEmail: "redaktion@bos-sh24.de",
      contactPhone: "+49 461 1234567",
      contactAddress: "Pressehaus BOS_SH24, Musterstraße 1, 24937 Flensburg",
      facebookUrl: "https://facebook.com/BOSSH24",
      instagramUrl: "https://instagram.com/bos_sh24",
      youtubeUrl: "https://youtube.com/@bossh24",
      tiktokUrl: "https://tiktok.com/@bossh24",
      xUrl: "https://x.com/bos_sh24",
      footerText:
        "BOS_SH24 ist eine unabhängige Presseagentur für Berichte aus dem Bereich Behörden und Organisationen mit Sicherheitsaufgaben (BOS) in Schleswig-Holstein.",
      impressumContent: `
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>BOS_SH24 Presseagentur (Platzhalter-Angaben – bitte durch echte Daten ersetzen)<br/>
        Max Mustermann<br/>
        Musterstraße 1<br/>
        24937 Flensburg</p>
        <h2>Kontakt</h2>
        <p>Telefon: +49 461 1234567<br/>E-Mail: redaktion@bos-sh24.de</p>
        <h2>Redaktionell verantwortlich</h2>
        <p>Max Mustermann, Musterstraße 1, 24937 Flensburg</p>
        <h2>EU-Streitschlichtung</h2>
        <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank">https://ec.europa.eu/consumers/odr/</a>.</p>
        <h2>Haftung für Inhalte</h2>
        <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
        Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen.</p>
      `.trim(),
      datenschutzContent: `
        <h2>1. Datenschutz auf einen Blick</h2>
        <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
        passiert, wenn Sie diese Website besuchen.</p>
        <h2>2. Verantwortliche Stelle</h2>
        <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist BOS_SH24, Musterstraße 1, 24937 Flensburg,
        redaktion@bos-sh24.de (Platzhalter – bitte durch echte Angaben ersetzen).</p>
        <h2>3. Datenerfassung auf dieser Website</h2>
        <p><strong>Kontaktformular:</strong> Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre
        Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der
        Anfrage bei uns gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
        <p><strong>Registrierung:</strong> Bei der Registrierung eines Benutzerkontos werden Name, Benutzername,
        E-Mail-Adresse und ein verschlüsseltes Passwort gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
        <p><strong>Newsletter:</strong> Wenn Sie den Newsletter abonnieren, verwenden wir Ihre E-Mail-Adresse
        ausschließlich für den Versand des Newsletters. Sie können sich jederzeit abmelden.</p>
        <h2>4. Ihre Rechte</h2>
        <p>Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
        Ihrer gespeicherten personenbezogenen Daten gemäß Art. 15–18 DSGVO.</p>
        <h2>5. Cookies</h2>
        <p>Diese Website verwendet technisch notwendige Cookies für Login und Sitzungsverwaltung. Optionale Cookies
        werden nur mit Ihrer Einwilligung gesetzt (siehe Cookie-Einstellungen).</p>
      `.trim(),
    },
  });

  // ---------- Benutzer ----------
  const [admin, editorMira, editorTom, userSophie, userJonas] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@bos-sh24.de" },
      update: {},
      create: {
        name: "Lars Petersen", username: "admin", email: "admin@bos-sh24.de",
        passwordHash, role: "ADMIN", bio: "Chefredakteur und Gründer von BOS_SH24.",
        avatarUrl: "https://picsum.photos/seed/bos-admin/200/200",
      },
    }),
    prisma.user.upsert({
      where: { email: "mira.jansen@bos-sh24.de" },
      update: {},
      create: {
        name: "Mira Jansen", username: "mira.jansen", email: "mira.jansen@bos-sh24.de",
        passwordHash, role: "EDITOR", bio: "Redakteurin mit Schwerpunkt Feuerwehr und Rettungsdienst.",
        avatarUrl: "https://picsum.photos/seed/bos-mira/200/200",
      },
    }),
    prisma.user.upsert({
      where: { email: "tom.reimers@bos-sh24.de" },
      update: {},
      create: {
        name: "Tom Reimers", username: "tom.reimers", email: "tom.reimers@bos-sh24.de",
        passwordHash, role: "EDITOR", bio: "Redakteur mit Schwerpunkt Polizei und Verkehr.",
        avatarUrl: "https://picsum.photos/seed/bos-tom/200/200",
      },
    }),
    prisma.user.upsert({
      where: { email: "sophie.wagner@beispiel.de" },
      update: {},
      create: {
        name: "Sophie Wagner", username: "sophie.wagner", email: "sophie.wagner@beispiel.de",
        passwordHash, role: "USER", avatarUrl: "https://picsum.photos/seed/bos-sophie/200/200",
      },
    }),
    prisma.user.upsert({
      where: { email: "jonas.clausen@beispiel.de" },
      update: {},
      create: {
        name: "Jonas Clausen", username: "jonas.clausen", email: "jonas.clausen@beispiel.de",
        passwordHash, role: "USER", avatarUrl: "https://picsum.photos/seed/bos-jonas/200/200",
      },
    }),
  ]);

  // ---------- Kategorien ----------
  const categoryDefs = [
    { name: "Aktuelles", color: "#3564ff", description: "Die aktuellsten Meldungen aus der Region." },
    { name: "Pressemitteilungen", color: "#0f1b5c", description: "Offizielle Pressemitteilungen von Behörden und Organisationen." },
    { name: "Veranstaltungen", color: "#7c3aed", description: "Berichte rund um öffentliche Veranstaltungen." },
    { name: "Einsatzberichte", color: "#e11d2e", description: "Ausführliche Berichte von Einsätzen der BOS." },
    { name: "Blaulicht", color: "#ef4444", description: "Kurzmeldungen aus dem Blaulichtmilieu." },
    { name: "Feuerwehr", color: "#dc2626", description: "Alles rund um die Feuerwehren in Schleswig-Holstein." },
    { name: "Rettungsdienst", color: "#059669", description: "Berichte aus dem Rettungsdienst." },
    { name: "Polizei", color: "#1d4ed8", description: "Meldungen der Polizei." },
    { name: "Verkehr", color: "#d97706", description: "Verkehrsunfälle und Verkehrsmeldungen." },
    { name: "Sonstiges", color: "#6b7280", description: "Weitere Themen abseits der Kategorien." },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const def of categoryDefs) {
    categories[def.name] = await prisma.category.upsert({
      where: { slug: slug(def.name) },
      update: {},
      create: { name: def.name, slug: slug(def.name), color: def.color, description: def.description },
    });
  }

  // ---------- Tags ----------
  async function tagIds(names: string[]) {
    const ids: { tagId: string }[] = [];
    for (const name of names) {
      const tag = await prisma.tag.upsert({
        where: { slug: slug(name) },
        update: {},
        create: { name, slug: slug(name) },
      });
      ids.push({ tagId: tag.id });
    }
    return ids;
  }

  // ---------- Beiträge ----------
  interface SeedPost {
    title: string; subtitle?: string; excerpt: string; content: string; category: string;
    tags: string[]; author: typeof admin; status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
    publishedAt?: Date; scheduledAt?: Date; featured?: boolean; viewCount: number; image: string;
    gallery?: { caption: string; seed: string }[];
  }

  const posts: SeedPost[] = [
    {
      title: "Großbrand in Lagerhalle: Feuerwehr Flensburg stundenlang im Einsatz",
      subtitle: "Rund 120 Einsatzkräfte bekämpften das Feuer in einem Gewerbegebiet",
      excerpt: "In der Nacht zu Dienstag brannte eine Lagerhalle im Gewerbegebiet Flensburg-Süd vollständig aus. Verletzte gab es nach ersten Erkenntnissen nicht.",
      content: `
        <p>Am frühen Dienstagmorgen wurde die Feuerwehr Flensburg zu einem Großbrand in einer Lagerhalle im
        Gewerbegebiet Flensburg-Süd alarmiert. Nach ersten Erkenntnissen der Einsatzleitung stand die Halle bereits
        beim Eintreffen der ersten Kräfte in Vollbrand.</p>
        <h2>Massives Aufgebot an Einsatzkräften</h2>
        <p>Insgesamt waren rund 120 Einsatzkräfte der Berufsfeuerwehr sowie mehrerer freiwilliger Wehren aus dem
        Umland im Einsatz. Die Löscharbeiten gestalteten sich aufgrund gelagerter Kunststoffe als schwierig und
        zogen sich bis in die Morgenstunden hin.</p>
        <blockquote>„Durch die dichte Rauchentwicklung mussten wir vorübergehend eine Umgebungswarnung aussprechen“,
        erklärte der Einsatzleiter der Feuerwehr Flensburg gegenüber BOS_SH24.</blockquote>
        <h2>Keine Verletzten, hoher Sachschaden</h2>
        <p>Verletzte gab es nach aktuellem Stand nicht. Die Kriminalpolizei hat die Ermittlungen zur Brandursache
        aufgenommen. Der Sachschaden wird auf einen hohen sechsstelligen Betrag geschätzt.</p>
        <ul>
          <li>Einsatzbeginn: 02:47 Uhr</li>
          <li>Rund 120 Einsatzkräfte im Einsatz</li>
          <li>Umgebungswarnung über NINA-App ausgesprochen</li>
          <li>Brandursache derzeit unklar</li>
        </ul>
      `,
      category: "Einsatzberichte", tags: ["Feuerwehr", "Großbrand", "Flensburg"], author: editorMira,
      status: "PUBLISHED", publishedAt: daysAgo(1), featured: true, viewCount: 812, image: "bos-fire-1",
      gallery: [
        { caption: "Dichter Rauch über dem Gewerbegebiet.", seed: "bos-fire-gallery-1" },
        { caption: "Löschfahrzeuge im Einsatz vor der Halle.", seed: "bos-fire-gallery-2" },
      ],
    },
    {
      title: "Verkehrsunfall auf der B199: Drei Verletzte nach Auffahrunfall",
      excerpt: "Auf der Bundesstraße 199 kam es am Mittwochnachmittag zu einem Auffahrunfall mit drei beteiligten Fahrzeugen.",
      content: `
        <p>Am Mittwochnachmittag ereignete sich auf der B199 zwischen Schleswig und Kappeln ein Verkehrsunfall mit
        drei beteiligten Fahrzeugen. Nach ersten Informationen der Polizei war ein PKW verkehrsbedingt zum Stehen
        gekommen, als zwei nachfolgende Fahrzeuge auffuhren.</p>
        <h2>Rettungsdienst versorgte drei Personen</h2>
        <p>Der Rettungsdienst versorgte drei leicht- bis mittelschwer verletzte Personen vor Ort. Alle Betroffenen
        wurden zur weiteren Behandlung in umliegende Krankenhäuser transportiert.</p>
        <p>Die B199 musste für rund 90 Minuten halbseitig gesperrt werden. Die Polizei bittet Zeugen, sich zu
        melden.</p>
      `,
      category: "Verkehr", tags: ["Verkehrsunfall", "B199", "Schleswig"], author: editorTom,
      status: "PUBLISHED", publishedAt: daysAgo(3), viewCount: 431, image: "bos-crash-1",
    },
    {
      title: "Wasserrettung auf der Flensburger Förde: Person aus Wasser gerettet",
      excerpt: "DLRG und Feuerwehr retteten am Wochenende einen Schwimmer, der in Seenot geraten war.",
      content: `
        <p>Ein Zeuge alarmierte am Samstagnachmittag die Wasserrettung, nachdem er eine Person in der Flensburger
        Förde in Not beobachtet hatte. Kräfte der DLRG und der Feuerwehr konnten die Person kurze Zeit später
        wohlbehalten aus dem Wasser bergen.</p>
        <p>Der Mann wurde vorsorglich vom Rettungsdienst untersucht, musste aber nicht in ein Krankenhaus gebracht
        werden.</p>
      `,
      category: "Rettungsdienst", tags: ["Wasserrettung", "DLRG", "Flensburger Förde"], author: editorMira,
      status: "PUBLISHED", publishedAt: daysAgo(5), viewCount: 267, image: "bos-water-1",
    },
    {
      title: "Polizei sucht Zeugen nach Einbruch in Supermarkt",
      excerpt: "Unbekannte brachen in der Nacht zum Sonntag in einen Supermarkt in Husum ein und entwendeten Bargeld.",
      content: `
        <p>In der Nacht zum Sonntag verschafften sich bislang unbekannte Täter gewaltsam Zutritt zu einem
        Supermarkt in der Husumer Innenstadt. Nach ersten Erkenntnissen entwendeten sie Bargeld aus dem
        Kassenbereich.</p>
        <p>Die Kriminalpolizei Husum hat die Ermittlungen aufgenommen und bittet um Zeugenhinweise unter der
        bekannten Rufnummer.</p>
      `,
      category: "Polizei", tags: ["Einbruch", "Husum", "Zeugenaufruf"], author: editorTom,
      status: "PUBLISHED", publishedAt: daysAgo(7), viewCount: 198, image: "bos-police-1",
    },
    {
      title: "Tag der offenen Tür bei der Feuerwehr Schleswig",
      excerpt: "Die Freiwillige Feuerwehr Schleswig lud am Wochenende zum Tag der offenen Tür ein – mit großem Erfolg.",
      content: `
        <p>Bei strahlendem Sonnenschein öffnete die Freiwillige Feuerwehr Schleswig am Samstag ihre Wache für
        Besucher aller Altersgruppen. Neben Fahrzeugvorführungen gab es auch einen Kinderschminkstand und
        Informationen zur Nachwuchsgewinnung.</p>
        <p>Mehrere hundert Besucherinnen und Besucher nutzten die Gelegenheit, einen Blick hinter die Kulissen der
        Feuerwehr zu werfen.</p>
      `,
      category: "Veranstaltungen", tags: ["Feuerwehr", "Tag der offenen Tür", "Schleswig"], author: editorMira,
      status: "PUBLISHED", publishedAt: daysAgo(10), viewCount: 356, image: "bos-event-1",
    },
    {
      title: "Pressemitteilung: Neue Rettungswache in Rendsburg eröffnet",
      excerpt: "Der Rettungsdienst Rendsburg-Eckernförde hat eine neue, modernisierte Rettungswache in Betrieb genommen.",
      content: `
        <p>Mit einem Festakt wurde am Freitag die neue Rettungswache in Rendsburg feierlich eröffnet. Die Wache
        verfügt über modernste Ausstattung und bietet Platz für vier Rettungswagen sowie einen Notarzteinsatz.</p>
        <p>„Mit dieser Wache sind wir für die kommenden Jahrzehnte hervorragend aufgestellt“, so der Leiter des
        Rettungsdienstes bei der Eröffnung.</p>
      `,
      category: "Pressemitteilungen", tags: ["Rettungsdienst", "Rendsburg", "Pressemitteilung"], author: admin,
      status: "PUBLISHED", publishedAt: daysAgo(12), viewCount: 289, image: "bos-ambulance-1",
    },
    {
      title: "Massenkarambolage auf der A7 sorgt für Vollsperrung",
      excerpt: "Dichter Nebel führte am Morgen zu einer Massenkarambolage mit mehreren beteiligten Fahrzeugen auf der A7.",
      content: `
        <p>Aufgrund dichten Nebels kam es am frühen Morgen auf der A7 in Höhe Neumünster zu einer
        Massenkarambolage mit insgesamt neun beteiligten Fahrzeugen. Rettungsdienst, Feuerwehr und Polizei waren
        mit einem Großaufgebot vor Ort.</p>
        <h2>Vollsperrung über mehrere Stunden</h2>
        <p>Die Autobahn musste in beide Richtungen für mehrere Stunden vollständig gesperrt werden. Mehrere
        Personen wurden verletzt, ein Rettungshubschrauber wurde nachalarmiert.</p>
      `,
      category: "Einsatzberichte", tags: ["A7", "Massenkarambolage", "Neumünster"], author: editorTom,
      status: "PUBLISHED", publishedAt: daysAgo(15), viewCount: 924, image: "bos-highway-1",
      gallery: [{ caption: "Rückstau nach der Vollsperrung der A7.", seed: "bos-highway-gallery-1" }],
    },
    {
      title: "Katze aus Baum gerettet: Kurioser Einsatz in Husum",
      excerpt: "Ein ungewöhnlicher Einsatz beschäftigte die Feuerwehr Husum: Eine Katze hatte sich in einem Baum festgeklemmt.",
      content: `
        <p>Nicht immer geht es bei Feuerwehreinsätzen um Leben und Tod: In Husum musste die Feuerwehr am
        Donnerstag ausrücken, um eine Katze aus rund acht Metern Höhe aus einem Baum zu retten. Mit der Drehleiter
        gelang die Rettung binnen weniger Minuten.</p>
      `,
      category: "Sonstiges", tags: ["Tierrettung", "Husum", "Feuerwehr"], author: editorMira,
      status: "PUBLISHED", publishedAt: daysAgo(18), viewCount: 645, image: "bos-cat-1",
    },
    {
      title: "Großübung von THW und Feuerwehr simuliert Hochwasserlage",
      excerpt: "Rund 200 Einsatzkräfte übten am Wochenende den Ernstfall bei einer simulierten Hochwasserlage an der Eider.",
      content: `
        <p>Bei einer groß angelegten Übung simulierten THW, Feuerwehr und DRK am Wochenende eine Hochwasserlage an
        der Eider. Ziel der Übung war es, die Zusammenarbeit der verschiedenen Organisationen im Ernstfall zu
        trainieren.</p>
        <p>Rund 200 Einsatzkräfte nahmen an der ganztägigen Übung teil, die von der Kreisleitstelle koordiniert
        wurde.</p>
      `,
      category: "Einsatzberichte", tags: ["THW", "Übung", "Hochwasser"], author: editorMira,
      status: "PUBLISHED", publishedAt: daysAgo(21), viewCount: 512, image: "bos-flood-1",
    },
    {
      title: "Rettungsdienst Schleswig-Holstein stellt neue Fahrzeuge vor",
      excerpt: "Zehn neue Rettungswagen wurden offiziell in den Dienst gestellt und modernisieren die Fahrzeugflotte.",
      content: `
        <p>Der Rettungsdienst des Kreises stellte am Dienstag zehn neue Rettungswagen offiziell in Dienst. Die
        Fahrzeuge verfügen über modernste medizinische Ausstattung und ersetzen ältere Modelle in der Flotte.</p>
      `,
      category: "Pressemitteilungen", tags: ["Rettungsdienst", "Fahrzeuge"], author: admin,
      status: "PUBLISHED", publishedAt: daysAgo(25), viewCount: 178, image: "bos-ambulance-2",
    },
    {
      title: "Verkehrskontrolle: Polizei zieht Bilanz nach Blitzmarathon",
      excerpt: "Bei einer landesweiten Geschwindigkeitskontrolle wurden zahlreiche Verstöße festgestellt.",
      content: `
        <p>Im Rahmen des jährlichen Blitzmarathons kontrollierte die Polizei Schleswig-Holstein an mehr als 50
        Messstellen die Geschwindigkeit. Dabei wurden über 800 Verstöße festgestellt, davon 12 mit Fahrverbot.</p>
      `,
      category: "Verkehr", tags: ["Polizei", "Blitzmarathon", "Verkehrskontrolle"], author: editorTom,
      status: "PUBLISHED", publishedAt: daysAgo(28), viewCount: 233, image: "bos-speed-1",
    },
    {
      title: "Kellerbrand in Neumünster: Bewohner rechtzeitig gerettet",
      excerpt: "Ein technischer Defekt löste einen Kellerbrand aus, bei dem zwei Bewohner rechtzeitig gerettet werden konnten.",
      content: `
        <p>Ein technischer Defekt an einer Waschmaschine hat in der Nacht zu Freitag einen Kellerbrand in einem
        Mehrfamilienhaus in Neumünster ausgelöst. Die Feuerwehr konnte zwei schlafende Bewohner rechtzeitig aus
        dem verrauchten Gebäude retten.</p>
        <p>Beide Personen wurden vorsorglich mit Verdacht auf Rauchgasvergiftung ins Krankenhaus gebracht.</p>
      `,
      category: "Blaulicht", tags: ["Feuerwehr", "Neumünster", "Kellerbrand"], author: editorMira,
      status: "PUBLISHED", publishedAt: daysAgo(32), viewCount: 389, image: "bos-fire-2",
    },
    {
      title: "Rettungshubschrauber im Einsatz nach Motorradunfall",
      excerpt: "Ein Motorradfahrer wurde bei einem Alleinunfall schwer verletzt und musste ausgeflogen werden.",
      content: `
        <p>Bei einem Alleinunfall auf einer Landstraße bei Eckernförde wurde ein Motorradfahrer am Sonntagnachmittag
        schwer verletzt. Aufgrund der Schwere der Verletzungen wurde ein Rettungshubschrauber nachalarmiert, der den
        Verunglückten in eine Spezialklinik brachte.</p>
      `,
      category: "Rettungsdienst", tags: ["Rettungshubschrauber", "Motorradunfall", "Eckernförde"], author: editorTom,
      status: "PUBLISHED", publishedAt: daysAgo(35), viewCount: 467, image: "bos-heli-1",
    },
    {
      title: "Herbstfest der Freiwilligen Feuerwehr Kiel lockt tausende Besucher",
      excerpt: "Beim jährlichen Herbstfest präsentierte sich die Feuerwehr Kiel mit einem bunten Programm für die ganze Familie.",
      content: `
        <p><em>Entwurf – wird nach redaktioneller Prüfung veröffentlicht.</em></p>
        <p>Das Herbstfest der Freiwilligen Feuerwehr Kiel zog auch in diesem Jahr wieder tausende Besucherinnen und
        Besucher an. Neben Fahrzeugschauen gab es ein buntes Bühnenprogramm und Attraktionen für Kinder.</p>
      `,
      category: "Veranstaltungen", tags: ["Feuerwehr", "Kiel", "Herbstfest"], author: editorMira,
      status: "DRAFT", viewCount: 0, image: "bos-event-2",
    },
    {
      title: "Böschungsbrand an der Bahnlinie sorgt für Zugausfälle",
      excerpt: "Ein Böschungsbrand entlang der Bahnstrecke Kiel–Flensburg führte zu erheblichen Zugverspätungen.",
      content: `
        <p><em>Dieser Beitrag ist zur Veröffentlichung eingeplant, sobald die Ermittlungen der Bundespolizei
        abgeschlossen sind.</em></p>
        <p>Ein Böschungsbrand entlang der Bahnstrecke zwischen Kiel und Flensburg sorgte am Nachmittag für einen
        stundenlangen Einsatz mehrerer Feuerwehren. Der Zugverkehr musste zeitweise komplett eingestellt werden.</p>
      `,
      category: "Einsatzberichte", tags: ["Böschungsbrand", "Bahnstrecke", "Feuerwehr"], author: editorTom,
      status: "SCHEDULED", scheduledAt: daysFromNow(3, 9, 0), viewCount: 0, image: "bos-train-1",
    },
    {
      title: "Rückblick: Die prägendsten Einsätze des vergangenen Jahres",
      excerpt: "BOS_SH24 blickt zurück auf die einsatzreichsten und außergewöhnlichsten Momente des vergangenen Jahres.",
      content: `
        <p>Ein ereignisreiches Jahr liegt hinter den Einsatzkräften in Schleswig-Holstein. In diesem Rückblick
        fassen wir die prägendsten Einsätze zusammen, über die BOS_SH24 berichtet hat – von Großbränden über
        Hochwasserlagen bis hin zu kuriosen Tierrettungen.</p>
        <hr/>
        <p>Wir bedanken uns bei allen Einsatzkräften für ihren unermüdlichen Einsatz und wünschen für das kommende
        Jahr weiterhin gute Heimkehr von jedem Einsatz.</p>
      `,
      category: "Aktuelles", tags: ["Rückblick", "Jahresrückblick"], author: admin,
      status: "ARCHIVED", publishedAt: daysAgo(120), viewCount: 1103, image: "bos-yearreview-1",
    },
  ];

  for (const p of posts) {
    const postSlug = slug(p.title);
    const existing = await prisma.post.findUnique({ where: { slug: postSlug } });
    if (existing) continue;

    await prisma.post.create({
      data: {
        title: p.title,
        subtitle: p.subtitle,
        slug: postSlug,
        excerpt: p.excerpt,
        content: p.content.trim(),
        coverImageUrl: `https://picsum.photos/seed/${p.image}/1200/800`,
        coverImageAlt: p.title,
        status: p.status,
        featured: p.featured ?? false,
        viewCount: p.viewCount,
        publishedAt: p.publishedAt,
        scheduledAt: p.scheduledAt,
        categoryId: categories[p.category].id,
        authorId: p.author.id,
        tags: { create: await tagIds(p.tags) },
        gallery: p.gallery
          ? { create: p.gallery.map((g, i) => ({ url: `https://picsum.photos/seed/${g.seed}/1200/800`, caption: g.caption, position: i })) }
          : undefined,
      },
    });
  }

  // ---------- Veranstaltungen ----------
  const events = [
    {
      title: "Tag der offenen Tür – Feuerwehr Schleswig",
      description: "Erlebe die Feuerwehr hautnah: Fahrzeugvorführungen, Kinderprogramm und Informationen zur Nachwuchsgewinnung.",
      startsAt: daysFromNow(14, 10, 0), endsAt: daysFromNow(14, 16, 0),
      location: "Feuerwache Schleswig", address: "Flensburger Str. 20, 24837 Schleswig",
      category: "Tag der offenen Tür", isPublic: true, image: "bos-event-open-1",
    },
    {
      title: "Blutspendetermin des DRK Flensburg",
      description: "Der DRK-Kreisverband Flensburg lädt zum regulären Blutspendetermin ein. Jede Spende zählt!",
      startsAt: daysFromNow(6, 15, 0), endsAt: daysFromNow(6, 19, 0),
      location: "DRK-Zentrum Flensburg", address: "Nordstraße 5, 24939 Flensburg",
      category: "Blutspende", isPublic: true, image: "bos-event-blood-1",
    },
    {
      title: "Gemeinsame Katastrophenschutzübung THW & Feuerwehr",
      description: "Übung zur Bewältigung einer simulierten Hochwasserlage entlang der Eider mit mehreren Organisationen.",
      startsAt: daysFromNow(21, 8, 0), endsAt: daysFromNow(21, 17, 0),
      location: "Übungsgelände Rendsburg", address: "Industriestraße 3, 24768 Rendsburg",
      category: "Übung", isPublic: true, image: "bos-event-drill-1",
    },
    {
      title: "Herbstfest der Freiwilligen Feuerwehr Kiel",
      description: "Buntes Programm für die ganze Familie mit Fahrzeugschau, Bühnenprogramm und Kinderaktionen.",
      startsAt: daysFromNow(30, 11, 0), endsAt: daysFromNow(30, 18, 0),
      location: "Feuerwache Kiel-Mitte", address: "Ringstraße 12, 24103 Kiel",
      category: "Fest", isPublic: true, image: "bos-event-fest-1",
    },
    {
      title: "Jahreshauptversammlung DLRG-Bezirk (intern)",
      description: "Interne Jahreshauptversammlung für Mitglieder des DLRG-Bezirks mit Wahlen und Jahresrückblick.",
      startsAt: daysFromNow(10, 18, 0), endsAt: daysFromNow(10, 21, 0),
      location: "Vereinsheim DLRG", address: "Seeweg 8, 24943 Flensburg",
      category: "Versammlung", isPublic: false, image: "bos-event-meeting-1",
    },
    {
      title: "Weihnachtsfeier des Rettungsdienstes",
      description: "Gemeinsame Weihnachtsfeier des Rettungsdienstpersonals zum Jahresausklang.",
      startsAt: daysAgo(20), endsAt: daysAgo(20),
      location: "Stadthalle Rendsburg", address: "Ostpreußenring 1, 24768 Rendsburg",
      category: "Fest", isPublic: true, image: "bos-event-xmas-1",
    },
    {
      title: "Sommerfest der Polizeidirektion",
      description: "Traditionelles Sommerfest mit Mitmachaktionen und Einblicken in die Polizeiarbeit.",
      startsAt: daysAgo(60), endsAt: daysAgo(60),
      location: "Polizeidirektion Flensburg", address: "Solitüde 25, 24939 Flensburg",
      category: "Fest", isPublic: true, image: "bos-event-summer-1",
    },
  ];

  for (const e of events) {
    const eventSlug = slug(e.title);
    const existing = await prisma.event.findUnique({ where: { slug: eventSlug } });
    if (existing) continue;
    await prisma.event.create({
      data: {
        title: e.title, slug: eventSlug, description: e.description,
        imageUrl: `https://picsum.photos/seed/${e.image}/1200/800`,
        startsAt: e.startsAt, endsAt: e.endsAt, location: e.location, address: e.address,
        category: e.category, isPublic: e.isPublic,
      },
    });
  }

  // ---------- Medienbibliothek ----------
  const mediaSeeds = [
    { seed: "bos-media-1", title: "Löschfahrzeug im Einsatz", uploader: editorMira },
    { seed: "bos-media-2", title: "Rettungswagen bei Nacht", uploader: editorMira },
    { seed: "bos-media-3", title: "Polizeifahrzeug im Einsatz", uploader: editorTom },
    { seed: "bos-media-4", title: "Drehleiter im Einsatz", uploader: editorMira },
    { seed: "bos-media-5", title: "Rettungshubschrauber", uploader: editorTom },
    { seed: "bos-media-6", title: "Einsatzkräfte bei Übung", uploader: admin },
  ];
  for (const m of mediaSeeds) {
    const url = `https://picsum.photos/seed/${m.seed}/1000/1000`;
    const existing = await prisma.media.findFirst({ where: { url } });
    if (existing) continue;
    await prisma.media.create({
      data: {
        filename: `${m.seed}.jpg`, url, mimeType: "image/jpeg", size: 245000,
        title: m.title, credit: "BOS_SH24 Redaktion", uploaderId: m.uploader.id,
      },
    });
  }

  // ---------- Kontaktanfragen ----------
  const contactSeeds = [
    { firstName: "Anna", lastName: "Petersen", email: "anna.petersen@beispiel.de", subject: "Presseanfrage zu Einsatzfotos", message: "Guten Tag, ich schreibe für die lokale Zeitung und würde gerne die Nutzungsrechte an einem Ihrer Einsatzfotos anfragen. Können Sie mir dazu Informationen zukommen lassen?", status: "NEW" as const },
    { firstName: "Ben", lastName: "Nissen", email: "ben.nissen@beispiel.de", subject: "Hinweis auf Verkehrsbehinderung", message: "Hallo BOS_SH24-Team, auf der L96 bei Husum gibt es aktuell eine größere Verkehrsbehinderung durch Bauarbeiten, die noch nicht auf Ihrer Seite gemeldet wurde.", status: "IN_PROGRESS" as const },
    { firstName: "Clara", lastName: "Thomsen", email: "clara.thomsen@beispiel.de", phone: "0461 998877", subject: "Kooperationsanfrage Feuerwehrverein", message: "Wir sind der Feuerwehrverein Husum und würden gerne unser Sommerfest über Ihre Plattform bewerben. Wie können wir eine Veranstaltung einreichen?", status: "DONE" as const },
    { firstName: "David", lastName: "Hansen", email: "david.hansen@beispiel.de", subject: "Fehler in Artikel gefunden", message: "In Ihrem Artikel über den Verkehrsunfall auf der B199 ist die Uhrzeit des Unfalls falsch angegeben. Bitte prüfen und korrigieren.", status: "NEW" as const },
    { firstName: "Emma", lastName: "Boysen", email: "emma.boysen@beispiel.de", subject: "Bildmaterial für Pressemitteilung", message: "Für unsere anstehende Pressemitteilung zur neuen Rettungswache hätten wir gerne zusätzliches Bildmaterial zur Verfügung gestellt. An wen kann ich mich wenden?", status: "IN_PROGRESS" as const },
    { firstName: "Finn", lastName: "Lorenzen", email: "finn.lorenzen@beispiel.de", subject: "Lob für die Berichterstattung", message: "Ich möchte mich für die stets schnelle und sachliche Berichterstattung bedanken. Weiter so!", status: "DONE" as const },
  ];
  for (const c of contactSeeds) {
    const existing = await prisma.contactMessage.findFirst({ where: { email: c.email, subject: c.subject } });
    if (existing) continue;
    await prisma.contactMessage.create({ data: c });
  }

  // ---------- Newsletter ----------
  const newsletterEmails = [
    "newsletter1@beispiel.de", "newsletter2@beispiel.de", "newsletter3@beispiel.de",
    "newsletter4@beispiel.de", "newsletter5@beispiel.de",
  ];
  for (const email of newsletterEmails) {
    await prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
  }

  // ---------- Favoriten & Benachrichtigungen ----------
  const firstPost = await prisma.post.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  if (firstPost) {
    await prisma.savedPost.upsert({
      where: { userId_postId: { userId: userSophie.id, postId: firstPost.id } },
      update: {},
      create: { userId: userSophie.id, postId: firstPost.id },
    });
  }

  for (const user of [admin, editorMira, editorTom, userSophie, userJonas]) {
    const existing = await prisma.notification.findFirst({ where: { userId: user.id, type: "welcome" } });
    if (existing) continue;
    await prisma.notification.create({
      data: { userId: user.id, type: "welcome", message: `Willkommen bei BOS_SH24, ${user.name.split(" ")[0]}!` },
    });
  }

  console.log("\nSeed abgeschlossen. Demo-Zugangsdaten (Passwort für alle: \"" + DEMO_PASSWORD + "\"):");
  console.log("  Administrator : admin@bos-sh24.de");
  console.log("  Redakteurin   : mira.jansen@bos-sh24.de");
  console.log("  Redakteur     : tom.reimers@bos-sh24.de");
  console.log("  Benutzerin    : sophie.wagner@beispiel.de");
  console.log("  Benutzer      : jonas.clausen@beispiel.de\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
