const LEXIQUE = {
  'bonjour': { fr: 'Bonjour', ar: 'صباح الخير', en: 'Hello', tr: 'Merhaba', tun: 'Ahla bik' },
  'merci': { fr: 'Merci', ar: 'شكراً جزيلاً', en: 'Thank you', tr: 'Teşekkür ederim', tun: 'Y3aychek' },
  'au revoir': { fr: 'Au revoir', ar: 'مع السلامة', en: 'Goodbye', tr: 'Hoşça kal', tun: 'Beslema' },
  'oui': { fr: 'Oui', ar: 'نعم', en: 'Yes', tr: 'Evet', tun: 'Aywa' },
  'non': { fr: 'Non', ar: 'لا', en: 'No', tr: 'Hayır', tun: 'Laa' },
  'prix': { fr: 'Prix', ar: 'السعر', en: 'Price', tr: 'Fiyat', tun: 'Tham' }
};

function detect(text) {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  const t = text.toLowerCase();
  if (/(salam|labes|chneya|baddel|brabi|aala|hamdoullah|y3aychek|beslema)/.test(t)) return 'tun';
  if (/(merhaba|nasıl|selam|teşekkür|lütfen)/.test(t)) return 'tr';
  if (/(hello|thank|please|how are|help)/.test(t)) return 'en';
  return 'fr';
}

function execute(params) {
  const text = params && params.text || '';
  const target = (params && params.target || '').toLowerCase();
  const src = detect(text);

  if (target) {
    const key = Object.keys(LEXIQUE).find(k => { const t = text.toLowerCase(); return t.includes(k) || t.includes(LEXIQUE[k].fr.toLowerCase()); });
    if (key && LEXIQUE[key][target]) return { skill: 'translateSkill', status: 'success', source: src, target, translation: LEXIQUE[key][target] };
    return { skill: 'translateSkill', status: 'success', source: src, target, translation: text };
  }

  switch (src) {
    case 'tun':
      return { skill: 'translateSkill', status: 'success', lang: 'tunisian', response: "Marhbé bik! Kifach najem n3awnek fel cabine lyoum?" };
    case 'ar':
      return { skill: 'translateSkill', status: 'success', lang: 'arabic', response: "أهلاً بك. كيف يمكنني مساعدتك اليوم؟" };
    case 'tr':
      return { skill: 'translateSkill', status: 'success', lang: 'turkish', response: "Merhaba! Bugün size nasıl yardımcı olabilirim?" };
    case 'en':
      return { skill: 'translateSkill', status: 'success', lang: 'english', response: "Hello! How can I help you today?" };
    default:
      return { skill: 'translateSkill', status: 'success', lang: 'french', response: "Bonjour ! Comment puis-je vous assister ?" };
  }
}

module.exports = { execute, detect };