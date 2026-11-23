/**
 * CertBench is written in American English, the language of CompTIA's own exam
 * objectives ("authorization", "data center", "defense in depth"). Its copy is
 * written that way; this is for text it shows that was not (a question from
 * the bank), so that one question does not say "organisation" and the next
 * "organization".
 *
 * Only spellings that are never right in American English are changed, word by
 * word and keeping each word's capitals. Words that merely look British
 * ("exercise", "premises", "analyses", "emphasis") are left alone.
 */

/** Verbs and nouns spelled -ise / -isation in British English: the part before the "s". */
const IZE_STEMS = [
  ...["organi", "reorgani", "disorgani", "authori", "unauthori", "deauthori", "centrali", "decentrali"],
  ...["tokeni", "minimi", "maximi", "personali", "utili", "standardi", "recogni", "unrecogni", "optimi"],
  ...["synchroni", "desynchroni", "prioriti", "deprioriti", "zeroi", "normali", "denormali", "parameteri"],
  ...["categori", "energi", "stabili", "destabili", "speciali", "visuali", "materiali", "saniti", "unsaniti"],
  ...["virtuali", "moderni", "initiali", "reinitiali", "containeri", "characteri", "locali", "customi"],
  ...["patroni", "ruggedi", "reali", "memori", "penali", "summari", "neutrali", "seriali", "deseriali"],
  ...["digiti", "anonymi", "pseudonymi", "randomi", "moneti", "weaponi", "critici", "capitali", "finali"],
  ...["formali", "generali", "harmoni", "legali", "mobili", "immobili", "polari", "symboli", "theori"],
  ...["vandali", "victimi", "apologi", "familiari", "itemi", "jeopardi", "scrutini", "subsidi", "magneti"],
  ...["demagneti", "immuni", "externali", "internali", "operationali", "rationali", "regulari", "sociali"],
  ...["incentivi", "compartmentali", "crystalli", "emphasi", "hypothesi", "equali", "sensiti", "desensiti"],
  ...["sterili", "fertili", "computeri", "ideali", "legitimi", "revolutioni", "antagoni", "commerciali"],
  ...["conceptuali", "contextuali", "economi", "globali", "individuali", "industriali", "institutionali"],
  ...["nationali", "naturali", "populari", "privati", "professionali", "publici", "rasteri", "vectori"],
  ...["vapori", "pressuri", "depressuri", "sympathi", "civili", "minimali", "automati"],
];

/**
 * A stem counts only with an ending that makes the British verb or its noun:
 * "emphasise" and "organisation" change, "emphasis" and "organism" do not.
 */
const IZE = new RegExp(`\\b(${IZE_STEMS.join("|")})s(e|es|ed|ing|ation|ations|er|ers|able)\\b`, "gi");

/** -our words, as the part before "our". "Discoloration" follows from "discolour". */
const OUR =
  /\b(behavi|col|discol|fav|neighb|rum|hon|dishon|lab|harb|vap|flav|hum|arm|endeav|sav|val|vig|ranc|clam|od|tum)our(?=s\b|ed\b|ing\b|al\b|ally\b|ite\b|ites\b|able\b|ably\b|hood\b|hoods\b|ful\b|less\b|ation\b|y\b|er\b|ers\b|\b)/gi;

/** Whole words, British to American. */
const WORDS: Record<string, string> = {
  centre: "center", centres: "centers", centred: "centered", centring: "centering",
  fibre: "fiber", fibres: "fibers", litre: "liter", litres: "liters", theatre: "theater", calibre: "caliber",
  defence: "defense", defences: "defenses", offence: "offense", offences: "offenses", pretence: "pretense",
  licence: "license", licences: "licenses",
  programme: "program", programmes: "programs",
  practise: "practice", practises: "practices", practised: "practiced", practising: "practicing",
  enrol: "enroll", enrols: "enrolls", enrolment: "enrollment", enrolments: "enrollments",
  fulfil: "fulfill", fulfils: "fulfills", fulfilment: "fulfillment", instalment: "installment",
  instalments: "installments", skilful: "skillful", wilful: "willful",
  labelled: "labeled", labelling: "labeling", modelled: "modeled", modelling: "modeling",
  cancelled: "canceled", cancelling: "canceling", travelled: "traveled", travelling: "traveling",
  signalled: "signaled", signalling: "signaling", tunnelled: "tunneled", tunnelling: "tunneling",
  channelled: "channeled", channelling: "channeling", levelled: "leveled", levelling: "leveling",
  fuelled: "fueled", fuelling: "fueling", dialled: "dialed", dialling: "dialing",
  totalled: "totaled", totalling: "totaling", counselling: "counseling",
  artefact: "artifact", artefacts: "artifacts", catalogue: "catalog", catalogues: "catalogs",
  catalogued: "cataloged", analogue: "analog", grey: "gray", greyed: "grayed",
  whilst: "while", amongst: "among", learnt: "learned",
  ageing: "aging", aluminium: "aluminum", sceptical: "skeptical", scepticism: "skepticism",
  manoeuvre: "maneuver", manoeuvres: "maneuvers", mould: "mold", sulphur: "sulfur", tyre: "tire",
  tyres: "tires", cheque: "check", cheques: "checks", cosy: "cozy", plough: "plow",
  analyse: "analyze", analysed: "analyzed", analysing: "analyzing", analyser: "analyzer",
  analysers: "analyzers", paralyse: "paralyze", paralysed: "paralyzed", catalyse: "catalyze",
  fortnight: "two weeks", fortnightly: "every two weeks",
};

const WORD = new RegExp(`\\b(${Object.keys(WORDS).join("|")})\\b`, "gi");

/** Measures: "metres", "kilometres", "centimetres". "Meter" the instrument is already spelled so. */
const METRE = /\b((?:kilo|centi|milli|nano|micro)?)metre(s?)\b/gi;

/** `to` with the capitals of `from`: "Centre" gives "Center", "CENTRE" gives "CENTER". */
function likeCase(from: string, to: string): string {
  if (from.length > 1 && from === from.toUpperCase()) return to.toUpperCase();
  if (from[0] === from[0].toUpperCase()) return to[0].toUpperCase() + to.slice(1);
  return to;
}

/** The same text in American spelling. Text already in it comes back unchanged. */
export function americanSpelling(text: string): string {
  if (!text) return text;
  return text
    .replace(IZE, (_m, stem: string, suffix: string) => `${stem}${suffix[0] === suffix[0].toUpperCase() && /[A-Z]/.test(suffix[0]) ? "Z" : "z"}${suffix}`)
    .replace(OUR, (_m, stem: string) => `${stem}${stem === stem.toUpperCase() && stem.length > 1 ? "OR" : "or"}`)
    .replace(METRE, (_m, prefix: string, s: string) => `${prefix}meter${s}`)
    .replace(WORD, (m) => likeCase(m, WORDS[m.toLowerCase()]));
}
