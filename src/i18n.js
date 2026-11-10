// -----------------------------------------------------------------------------
// Texts of the integration, in English, French, German and Spanish (English
// fallback).
//
// The manifest carries its own labels; these are the texts the code writes at
// runtime: device and feature names, widget contents, scene summaries,
// messages of the Configuration screen. Vocabulary of the Gladys interface:
// appareil / Gerät / dispositivo, scène / Szene / escena.
// -----------------------------------------------------------------------------

const LANGUAGES = ['en', 'fr', 'de', 'es'];

const TEXTS = {
  // devices
  poolDeviceName: {
    en: 'iopool {title}',
    fr: 'iopool {title}',
    de: 'iopool {title}',
    es: 'iopool {title}',
  },
  defaultTitle: { en: 'pool', fr: 'piscine', de: 'Pool', es: 'piscina' },
  featureTemperature: {
    en: 'Water temperature',
    fr: 'Température de l’eau',
    de: 'Wassertemperatur',
    es: 'Temperatura del agua',
  },
  featurePh: { en: 'pH', fr: 'pH', de: 'pH-Wert', es: 'pH' },
  featureOrp: { en: 'Redox (ORP)', fr: 'Redox (ORP)', de: 'Redox (ORP)', es: 'Redox (ORP)' },
  featureFiltration: {
    en: 'Recommended filtration',
    fr: 'Filtration recommandée',
    de: 'Empfohlene Filterung',
    es: 'Filtración recomendada',
  },
  featureAction: {
    en: 'Action required',
    fr: 'Action requise',
    de: 'Handlung erforderlich',
    es: 'Acción requerida',
  },
  featurePoolMode: {
    en: 'Pool mode',
    fr: 'Mode du bassin',
    de: 'Poolmodus',
    es: 'Modo de la piscina',
  },

  // action required
  action_yes: {
    en: 'Action required',
    fr: 'Action requise',
    de: 'Handlung erforderlich',
    es: 'Acción requerida',
  },
  action_no: { en: 'Nothing to do', fr: 'Rien à faire', de: 'Nichts zu tun', es: 'Nada que hacer' },
  action_unknown: { en: 'Unknown', fr: 'Inconnu', de: 'Unbekannt', es: 'Desconocido' },

  // pool modes
  poolMode_STANDARD: { en: 'Standard', fr: 'Standard', de: 'Standard', es: 'Estándar' },
  poolMode_OPENING: {
    en: 'Opening',
    fr: 'Remise en route',
    de: 'Saisonstart',
    es: 'Puesta en marcha',
  },
  poolMode_ACTIVE_WINTER: {
    en: 'Active wintering',
    fr: 'Hivernage actif',
    de: 'Aktive Überwinterung',
    es: 'Invernaje activo',
  },
  poolMode_WINTER: {
    en: 'Passive wintering',
    fr: 'Hivernage passif',
    de: 'Passive Überwinterung',
    es: 'Invernaje pasivo',
  },
  poolMode_INITIALIZATION: {
    en: 'Initialization',
    fr: 'Initialisation',
    de: 'Initialisierung',
    es: 'Inicialización',
  },

  // measure modes (how the probe took the measure)
  measureMode_standard: { en: 'Standard', fr: 'Standard', de: 'Standard', es: 'Estándar' },
  measureMode_live: { en: 'Live', fr: 'Direct', de: 'Live', es: 'En directo' },
  measureMode_maintenance: {
    en: 'Maintenance',
    fr: 'Maintenance',
    de: 'Wartung',
    es: 'Mantenimiento',
  },
  measureMode_manual: { en: 'Manual', fr: 'Manuelle', de: 'Manuell', es: 'Manual' },
  measureMode_backup: { en: 'Backup', fr: 'Secours', de: 'Ersatz', es: 'Respaldo' },
  measureMode_gateway: { en: 'Gateway', fr: 'Passerelle', de: 'Gateway', es: 'Pasarela' },

  // widget
  tileWater: { en: 'Water', fr: 'Eau', de: 'Wasser', es: 'Agua' },
  tilePh: { en: 'pH', fr: 'pH', de: 'pH', es: 'pH' },
  tileOrp: { en: 'Redox', fr: 'Redox', de: 'Redox', es: 'Redox' },
  tileFiltration: { en: 'Filtration', fr: 'Filtration', de: 'Filterung', es: 'Filtración' },
  rowAction: {
    en: 'iopool advice',
    fr: 'Conseil iopool',
    de: 'iopool-Hinweis',
    es: 'Consejo iopool',
  },
  rowPoolMode: { en: 'Pool mode', fr: 'Mode du bassin', de: 'Poolmodus', es: 'Modo' },
  rowMeasure: { en: 'Measure', fr: 'Mesure', de: 'Messung', es: 'Medida' },
  measureValid: {
    en: '{mode} · valid',
    fr: '{mode} · valide',
    de: '{mode} · gültig',
    es: '{mode} · válida',
  },
  measureInvalid: {
    en: '{mode} · not validated',
    fr: '{mode} · non validée',
    de: '{mode} · nicht bestätigt',
    es: '{mode} · no validada',
  },
  measuredAgo: {
    en: 'Measured {ago} · {name}',
    fr: 'Mesuré {ago} · {name}',
    de: 'Gemessen {ago} · {name}',
    es: 'Medido {ago} · {name}',
  },
  hoursPerDay: { en: 'h/day', fr: 'h/jour', de: 'h/Tag', es: 'h/día' },
  chart_temperature: {
    en: 'Water temperature',
    fr: 'Température de l’eau',
    de: 'Wassertemperatur',
    es: 'Temperatura del agua',
  },
  chart_ph: { en: 'pH', fr: 'pH', de: 'pH-Wert', es: 'pH' },
  chart_orp: { en: 'Redox (ORP)', fr: 'Redox (ORP)', de: 'Redox (ORP)', es: 'Redox (ORP)' },
  chart_filtration: {
    en: 'Recommended filtration',
    fr: 'Filtration recommandée',
    de: 'Empfohlene Filterung',
    es: 'Filtración recomendada',
  },
  adviceNothing: {
    en: 'iopool asks for nothing: the water is fine.',
    fr: 'iopool ne demande rien : l’eau va bien.',
    de: 'iopool verlangt nichts: Das Wasser ist in Ordnung.',
    es: 'iopool no pide nada: el agua está bien.',
  },
  adviceAction: {
    en: 'iopool asks for an action: open the iopool app to see what to do.',
    fr: 'iopool demande une action : ouvrez l’application iopool pour savoir quoi faire.',
    de: 'iopool verlangt eine Handlung: Öffnen Sie die iopool-App, um zu sehen, was zu tun ist.',
    es: 'iopool pide una acción: abra la aplicación iopool para ver qué hacer.',
  },
  adviceFiltration: {
    en: 'Filter about {duration} a day.',
    fr: 'Filtrez environ {duration} par jour.',
    de: 'Filtern Sie etwa {duration} pro Tag.',
    es: 'Filtre unas {duration} al día.',
  },
  adviceStale: {
    en: 'No measure for {hours} h: check the iopool EcO probe (battery, Wi-Fi or gateway).',
    fr: 'Aucune mesure depuis {hours} h : vérifiez la sonde iopool EcO (pile, Wi-Fi ou passerelle).',
    de: 'Seit {hours} h keine Messung: Prüfen Sie die iopool-EcO-Sonde (Batterie, WLAN oder Gateway).',
    es: 'Sin medida desde hace {hours} h: revise la sonda iopool EcO (pila, wifi o pasarela).',
  },
  adviceWinter: {
    en: 'Passive wintering: no measure is expected until the pool reopens.',
    fr: 'Hivernage passif : aucune mesure n’est attendue avant la remise en route.',
    de: 'Passive Überwinterung: Bis zum Saisonstart wird keine Messung erwartet.',
    es: 'Invernaje pasivo: no se espera ninguna medida hasta la puesta en marcha.',
  },
  noApiKey: {
    en: 'Enter the API key of the iopool app (Settings, at the bottom) in the configuration.',
    fr: 'Saisissez la clé API de l’application iopool (Paramètres, tout en bas) dans la configuration.',
    de: 'Geben Sie den API-Schlüssel der iopool-App (Einstellungen, ganz unten) in der Konfiguration ein.',
    es: 'Introduzca la clave API de la aplicación iopool (Ajustes, abajo del todo) en la configuración.',
  },
  notReadYet: {
    en: 'Reading iopool…',
    fr: 'Lecture d’iopool…',
    de: 'iopool wird gelesen…',
    es: 'Leyendo iopool…',
  },
  noPool: {
    en: 'No pool in this iopool account.',
    fr: 'Aucun bassin dans ce compte iopool.',
    de: 'Kein Pool in diesem iopool-Konto.',
    es: 'Ninguna piscina en esta cuenta iopool.',
  },
  noMeasure: {
    en: 'No measure yet: the probe may still be initializing.',
    fr: 'Pas encore de mesure : la sonde est peut-être en cours d’initialisation.',
    de: 'Noch keine Messung: Die Sonde wird vielleicht noch initialisiert.',
    es: 'Aún sin medida: la sonda puede estar inicializándose.',
  },

  // durations
  duration_hours: { en: '{h} h', fr: '{h} h', de: '{h} Std.', es: '{h} h' },
  duration_hoursMinutes: {
    en: '{h} h {m} min',
    fr: '{h} h {m}',
    de: '{h} Std. {m} Min.',
    es: '{h} h {m} min',
  },
  duration_minutes: { en: '{m} min', fr: '{m} min', de: '{m} Min.', es: '{m} min' },

  // relative times
  ago_now: { en: 'just now', fr: 'à l’instant', de: 'gerade eben', es: 'ahora mismo' },
  ago_minutes: { en: '{n} min ago', fr: 'il y a {n} min', de: 'vor {n} Min.', es: 'hace {n} min' },
  ago_hours: { en: '{n} h ago', fr: 'il y a {n} h', de: 'vor {n} Std.', es: 'hace {n} h' },
  ago_days: { en: '{n} d ago', fr: 'il y a {n} j', de: 'vor {n} T.', es: 'hace {n} d' },

  // scene summaries
  summaryMeasure: {
    en: '{name}: water {temperature} °C, pH {ph}, redox {orp} mV.',
    fr: '{name} : eau {temperature} °C, pH {ph}, redox {orp} mV.',
    de: '{name}: Wasser {temperature} °C, pH {ph}, Redox {orp} mV.',
    es: '{name}: agua {temperature} °C, pH {ph}, redox {orp} mV.',
  },
  summaryActionRequired: {
    en: '{name}: iopool asks for an action on the water.',
    fr: '{name} : iopool demande une action sur l’eau.',
    de: '{name}: iopool verlangt eine Handlung am Wasser.',
    es: '{name}: iopool pide una acción sobre el agua.',
  },
  summaryActionResolved: {
    en: '{name}: no more action required by iopool.',
    fr: '{name} : plus aucune action demandée par iopool.',
    de: '{name}: iopool verlangt keine Handlung mehr.',
    es: '{name}: iopool ya no pide ninguna acción.',
  },
  summaryPoolMode: {
    en: '{name}: pool mode changed to {mode}.',
    fr: '{name} : le bassin passe en mode {mode}.',
    de: '{name}: Poolmodus auf {mode} geändert.',
    es: '{name}: la piscina pasa al modo {mode}.',
  },
  summaryFiltration: {
    en: '{name}: recommended filtration now {duration} a day (was {previous}).',
    fr: '{name} : filtration recommandée désormais de {duration} par jour (au lieu de {previous}).',
    de: '{name}: empfohlene Filterung jetzt {duration} pro Tag (vorher {previous}).',
    es: '{name}: filtración recomendada ahora de {duration} al día (antes {previous}).',
  },
  summaryStopped: {
    en: '{name}: no measure for {hours} h.',
    fr: '{name} : aucune mesure depuis {hours} h.',
    de: '{name}: seit {hours} h keine Messung.',
    es: '{name}: sin medida desde hace {hours} h.',
  },

  // connection status and Configuration screen
  statusConnected: {
    en: 'Connected to iopool: {pools} pool(s).',
    fr: 'Connecté à iopool : {pools} bassin(s).',
    de: 'Mit iopool verbunden: {pools} Pool(s).',
    es: 'Conectado a iopool: {pools} piscina(s).',
  },
  statusNoPool: {
    en: 'Connected, but this iopool account has no pool.',
    fr: 'Connecté, mais ce compte iopool n’a aucun bassin.',
    de: 'Verbunden, aber dieses iopool-Konto hat keinen Pool.',
    es: 'Conectado, pero esta cuenta iopool no tiene ninguna piscina.',
  },
  statusInvalidKey: {
    en: 'iopool refused the API key: copy it again from the iopool app (Settings, at the bottom).',
    fr: 'iopool a refusé la clé API : recopiez-la depuis l’application iopool (Paramètres, tout en bas).',
    de: 'iopool hat den API-Schlüssel abgelehnt: Kopieren Sie ihn erneut aus der iopool-App (Einstellungen, ganz unten).',
    es: 'iopool rechazó la clave API: cópiela de nuevo desde la aplicación iopool (Ajustes, abajo del todo).',
  },
  statusRateLimited: {
    en: 'iopool limits the requests for now: new try at the next reading.',
    fr: 'iopool limite les requêtes pour le moment : nouvel essai à la prochaine lecture.',
    de: 'iopool begrenzt die Anfragen gerade: neuer Versuch beim nächsten Lesen.',
    es: 'iopool limita las peticiones por ahora: nuevo intento en la próxima lectura.',
  },
  statusUnreachable: {
    en: 'The iopool API does not answer: new try at the next reading.',
    fr: 'L’API iopool ne répond pas : nouvel essai à la prochaine lecture.',
    de: 'Die iopool-API antwortet nicht: neuer Versuch beim nächsten Lesen.',
    es: 'La API de iopool no responde: nuevo intento en la próxima lectura.',
  },
  testOk: {
    en: 'API key accepted: {pools} pool(s) found.',
    fr: 'Clé API acceptée : {pools} bassin(s) trouvé(s).',
    de: 'API-Schlüssel akzeptiert: {pools} Pool(s) gefunden.',
    es: 'Clave API aceptada: {pools} piscina(s) encontrada(s).',
  },
};

/**
 * @description Whether a value is one of the supported languages.
 * @param {unknown} value - The value.
 * @returns {boolean} True for en, fr, de or es.
 * @example
 * isLanguage('fr'); // -> true
 */
function isLanguage(value) {
  return LANGUAGES.includes(value);
}

/**
 * @description A text in a language (English fallback), with its
 * substitutions.
 * @param {string} key - The TEXTS key.
 * @param {string} language - The language.
 * @param {object} [values] - The substitutions.
 * @returns {string} The text.
 * @example
 * t('poolDeviceName', 'fr', { title: 'Jardin' }); // -> 'iopool Jardin'
 */
function t(key, language, values = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    return key;
  }
  const template = entry[language] ?? entry.en;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

/**
 * @description The text in every language, for a multi-language message.
 * @param {string} key - The TEXTS key.
 * @param {object} [values] - The substitutions.
 * @returns {{ en: string, fr: string, de: string, es: string }} The message.
 * @example
 * all('statusConnected', { pools: 1 });
 */
function all(key, values = {}) {
  return Object.fromEntries(LANGUAGES.map((language) => [language, t(key, language, values)]));
}

/**
 * @description A number written the way a language does, with at most
 * `digits` decimals ("7,2" in French).
 * @param {number|null} value - The number.
 * @param {string} language - The language.
 * @param {number} digits - The decimals.
 * @returns {string} The text, "?" when unknown.
 * @example
 * formatNumber(7.25, 'fr', 1); // -> '7,3'
 */
function formatNumber(value, language, digits) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '?';
  }
  return new Intl.NumberFormat(isLanguage(language) ? language : 'en', {
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * @description "12 min ago" for an instant.
 * @param {number} instant - The instant, in ms.
 * @param {number} now - Now, in ms.
 * @param {string} language - The language.
 * @returns {string} The relative time.
 * @example
 * ago(Date.now() - 600000, Date.now(), 'en'); // -> '10 min ago'
 */
function ago(instant, now, language) {
  const minutes = Math.max(0, Math.floor((now - instant) / 60000));
  if (minutes < 1) {
    return t('ago_now', language);
  }
  if (minutes < 60) {
    return t('ago_minutes', language, { n: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return t('ago_hours', language, { n: hours });
  }
  return t('ago_days', language, { n: Math.floor(hours / 24) });
}

/**
 * @description A duration in minutes, written "6 h 30" / "6 h 30 min".
 * @param {number|null} minutes - The duration.
 * @param {string} language - The language.
 * @returns {string} The text, "?" when unknown.
 * @example
 * formatDuration(390, 'fr'); // -> '6 h 30'
 */
function formatDuration(minutes, language) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    return '?';
  }
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = String(total % 60).padStart(2, '0');
  if (h === 0) {
    return t('duration_minutes', language, { m: total % 60 });
  }
  return m === '00'
    ? t('duration_hours', language, { h })
    : t('duration_hoursMinutes', language, { h, m });
}

export { LANGUAGES, TEXTS, isLanguage, t, all, formatNumber, formatDuration, ago };
