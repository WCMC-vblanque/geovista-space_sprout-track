/**
 * One development/care tip per week of a baby's first year, sourced from
 * official national health authorities and midwife bodies (not blogs or
 * generic parenting sites). `title` and `tip` are used as translation keys
 * via useLocalization()'s t() — see src/localization/translations/en.json.
 *
 * Currently covers weeks 1-12. Weeks 13-52 are tracked as a follow-up
 * (GitHub issue) since each entry requires genuine verified sourcing.
 */
export interface WeeklyTip {
  week: number;
  title: string;
  tip: string;
  sourceName: string;
  sourceUrl: string;
  sourceCountry: 'UK' | 'France' | 'Spain' | 'Denmark';
}

export const WEEKLY_TIPS: WeeklyTip[] = [
  {
    week: 1,
    title: 'Watch for early hunger cues',
    tip: "Newborns show they're hungry well before they cry — look for lip-smacking, stirring, sucking on their hands, or turning their head toward you. Crying is actually a late sign of hunger, so catching these earlier cues can make feeds calmer for you both. Breastfed babies typically feed 8-12 times in 24 hours, which is completely normal.",
    sourceName: 'NHS (UK)',
    sourceUrl: 'https://cambspborochildrenshealth.nhs.uk/feeding-and-eating/feeding-cues-and-signs-of-getting-enough-milk/',
    sourceCountry: 'UK',
  },
  {
    week: 2,
    title: 'Jaundice and crying are usually normal',
    tip: "Many newborns turn slightly yellow (jaundice) around day 3, and it usually fades on its own within a couple of weeks — mention it to your midwife if it lasts longer or your baby seems unwell. It's also completely normal for a young baby to cry, on and off, for up to two hours a day. If you're ever worried, trust your instinct and call your health visitor or GP.",
    sourceName: 'AEPED (Spain)',
    sourceUrl: 'https://www.aeped.es/enfamilia/salud-en-familia/cosas-normales-en-recien-nacidos',
    sourceCountry: 'Spain',
  },
  {
    week: 3,
    title: 'How much sleep is normal at this age',
    tip: "Babies aged 0-3 months are recommended to sleep around 14-17 hours a day, though anywhere from 11 to 19 hours can still be normal for an individual baby. Don't worry about hitting an exact number, especially in the very first days after birth when longer sleep is expected. Every baby settles into their own rhythm at their own pace.",
    sourceName: 'Sundhedsstyrelsen (Denmark)',
    sourceUrl: 'https://www.sst.dk/vidensbase/forebyggelse/anbefalinger-for-soevnlaengde',
    sourceCountry: 'Denmark',
  },
  {
    week: 4,
    title: 'Reduce the risk of SIDS',
    tip: "Always put your baby to sleep on their back, in their own cot or Moses basket, in the same room as you for at least the first six months, including for naps. Keep their feet at the end of the cot ('feet to foot'), avoid loose blankets or cushions, and keep the room between 16-20C. Never smoke around your baby, and keep vaccinations on schedule — all of this lowers the risk of sudden infant death syndrome.",
    sourceName: 'NHS (UK)',
    sourceUrl: 'https://www.nhs.uk/baby/caring-for-a-newborn/sudden-infant-death-syndrome-sids/',
    sourceCountry: 'UK',
  },
  {
    week: 5,
    title: 'Vitamin D drops from two weeks',
    tip: "From two weeks of age, babies are recommended a daily vitamin D supplement (10 micrograms, about 5 drops) up until age four, since it's hard to get enough from sunlight and diet alone. If your baby has at least 800ml of infant formula a day, they're already getting enough and don't need extra drops. Ask your health visitor if you're unsure which applies to your baby.",
    sourceName: 'Sundhedsstyrelsen (Denmark)',
    sourceUrl: 'https://www.sst.dk/vidensbase/graviditet-og-smaaboern/kost-til-smaaboern/d-vitamin-og-jerntilskud-til-boern',
    sourceCountry: 'Denmark',
  },
  {
    week: 6,
    title: 'Colic often peaks around six weeks',
    tip: "If your baby has bouts of intense crying lasting three hours or more, it may be colic — very common, and it usually eases by 3-4 months. Try holding your baby upright after feeds to help bring up wind, gentle clockwise tummy massage, or 'bicycling' their legs. Responding early with a feed or cuddle helps more than any product on the shelf — most colic remedies work no better than a placebo.",
    sourceName: 'AEPED (Spain)',
    sourceUrl: 'https://www.aeped.es/enfamilia/salud-en-familia/colicos-lactante',
    sourceCountry: 'Spain',
  },
  {
    week: 7,
    title: 'Always put baby down on their back',
    tip: "Lay your baby flat on their back on a firm mattress, with nothing loose in the cot — no pillow, blanket, bumper or soft toy. For at least the first six months, it's safer to keep their crib in your own bedroom. Watch for your baby's tired signs and put them down as soon as you notice them, rather than waiting until they're overtired.",
    sourceName: 'Santé publique France (1000 premiers jours)',
    sourceUrl: 'https://www.1000-premiers-jours.fr/fr/le-sommeil-de-bebe',
    sourceCountry: 'France',
  },
  {
    week: 8,
    title: 'First vaccinations at 8 weeks',
    tip: "At 8 weeks old, your baby is due their first big round of vaccinations: the 6-in-1 jab (protecting against diphtheria, hepatitis B, Hib, polio, tetanus and whooping cough), plus the MenB and rotavirus vaccines. It's normal for babies to be a little unsettled or feverish afterwards — your GP or health visitor can advise on infant paracetamol if needed. These vaccines protect your baby during a period when they're most vulnerable to serious infection.",
    sourceName: 'NHS (UK)',
    sourceUrl: 'https://www.nhs.uk/vaccinations/6-in-1-vaccine/',
    sourceCountry: 'UK',
  },
  {
    week: 9,
    title: 'Your baby is learning to organise sleep',
    tip: "Newborns don't yet have an adult day/night rhythm, but over these early weeks your baby gradually starts learning to tell day from night. You can help by keeping things calm and dim at night and brighter or louder during the day, and by keeping routines like bath time around the same time each day. It won't produce a full night's sleep yet, but it lays the groundwork.",
    sourceName: 'AEPED (Spain)',
    sourceUrl: 'https://www.aeped.es/enfamilia/salud-en-familia/el-sueno-en-el-recien-nacido',
    sourceCountry: 'Spain',
  },
  {
    week: 10,
    title: 'New skills: cooing and lifting their head',
    tip: 'Around two months, many babies start cooing and reacting to your voice, show early emotions like joy or frustration, and briefly lift their head and shoulders during tummy time. They may also start swiping at or grasping nearby objects. Treat this as a rough guide, not a checklist — every baby moves through these at their own pace.',
    sourceName: 'Santé publique France (1000 premiers jours)',
    sourceUrl: 'https://www.1000-premiers-jours.fr/fr/les-etapes-du-developpement-de-bebe',
    sourceCountry: 'France',
  },
  {
    week: 11,
    title: 'Talk and sing face-to-face with your baby',
    tip: "Your baby's hearing is checked in the first weeks of life, and from birth they're already tuning into your voice. Try to get face-to-face with your baby when you talk, sing the same songs and rhymes over and over, and respond warmly when they make sounds — this back-and-forth is how they learn to make sounds themselves. Ask your health visitor if you have any concerns about your baby's hearing or responses to sound.",
    sourceName: 'NHS (UK)',
    sourceUrl: 'https://www.nhs.uk/best-start-in-life/baby/learning-to-talk/first-sounds-0-to-6-months/',
    sourceCountry: 'UK',
  },
  {
    week: 12,
    title: 'Around three months: smiles and steadier head control',
    tip: "By around three months, many babies hold their head up more steadily, move all four limbs more symmetrically, and reward you with real social smiles. They're also getting better at expressing emotions and recognising familiar faces and voices. If your baby isn't showing any of these signs at all, mention it to your health visitor or GP at your next check.",
    sourceName: 'Santé publique France (1000 premiers jours)',
    sourceUrl: 'https://www.1000-premiers-jours.fr/fr/les-etapes-du-developpement-de-bebe',
    sourceCountry: 'France',
  },
];
