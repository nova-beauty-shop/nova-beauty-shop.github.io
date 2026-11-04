export type InfoPageSlug = 'faq' | 'shipping' | 'returns' | 'contact' | 'privacy' | 'terms';

export interface InfoQuestion {
  question: string;
  answer: string;
}

export interface InfoContactCard {
  label: string;
  value: string;
}

export interface InfoSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  questions?: InfoQuestion[];
  cards?: InfoContactCard[];
}

export interface InfoPage {
  slug: InfoPageSlug;
  navLabel: string;
  title: string;
  lead: string;
  sections: InfoSection[];
}
