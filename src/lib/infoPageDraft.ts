import type { InfoPageContent, InfoPageStatus, SaveInfoPageInput } from '@/lib/infoPages';
import type { InfoPageSlug, InfoSection } from '@/types/info';

export interface SectionDraft {
  heading: string;
  paragraphs: string;
  bullets: string;
  questions: { question: string; answer: string }[];
  cards: { label: string; value: string }[];
}

export interface PageDraft {
  title: string;
  lead: string;
  seoTitle: string;
  seoDescription: string;
  sections: SectionDraft[];
}

export const INFO_PAGE_LIMITS = {
  title: 120,
  lead: 500,
  seoTitle: 70,
  seoDescription: 200,
  heading: 120,
  sections: 30,
} as const;

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sectionToDraft(section: InfoSection): SectionDraft {
  return {
    heading: section.heading,
    paragraphs: (section.paragraphs ?? []).join('\n\n'),
    bullets: (section.bullets ?? []).join('\n'),
    questions: (section.questions ?? []).map((item) => ({ question: item.question, answer: item.answer })),
    cards: (section.cards ?? []).map((item) => ({ label: item.label, value: item.value })),
  };
}

export function emptySectionDraft(): SectionDraft {
  return { heading: '', paragraphs: '', bullets: '', questions: [], cards: [] };
}

export function toPageDraft(content: InfoPageContent): PageDraft {
  return {
    title: content.title,
    lead: content.lead,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    sections: content.sections.map(sectionToDraft),
  };
}

function draftToSection(draft: SectionDraft): InfoSection {
  const section: InfoSection = { heading: draft.heading.trim() };
  const paragraphs = splitParagraphs(draft.paragraphs);
  const bullets = splitLines(draft.bullets);
  const questions = draft.questions
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question.length > 0);
  const cards = draft.cards
    .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
    .filter((item) => item.label.length > 0);

  if (paragraphs.length > 0) section.paragraphs = paragraphs;
  if (bullets.length > 0) section.bullets = bullets;
  if (questions.length > 0) section.questions = questions;
  if (cards.length > 0) section.cards = cards;
  return section;
}

export function validatePageDraft(draft: PageDraft): string | null {
  if (draft.title.trim().length === 0) return 'عنوان صفحه را وارد کنید.';
  if (draft.title.trim().length > INFO_PAGE_LIMITS.title) return 'عنوان صفحه بیش از حد مجاز است.';
  if (draft.lead.length > INFO_PAGE_LIMITS.lead) return 'متن معرفی بیش از حد مجاز است.';
  if (draft.seoTitle.length > INFO_PAGE_LIMITS.seoTitle) return 'عنوان سئو بیش از حد مجاز است.';
  if (draft.seoDescription.length > INFO_PAGE_LIMITS.seoDescription) return 'توضیح سئو بیش از حد مجاز است.';
  if (draft.sections.length > INFO_PAGE_LIMITS.sections) return 'تعداد بخش‌ها بیش از حد مجاز است.';
  for (const section of draft.sections) {
    const heading = section.heading.trim();
    if (heading.length === 0) return 'عنوان هر بخش را وارد کنید.';
    if (heading.length > INFO_PAGE_LIMITS.heading) return 'عنوان یکی از بخش‌ها بیش از حد مجاز است.';
  }
  return null;
}

export function toSaveInput(slug: InfoPageSlug, draft: PageDraft, status: InfoPageStatus): SaveInfoPageInput {
  return {
    slug,
    title: draft.title.trim(),
    lead: draft.lead.trim(),
    seoTitle: draft.seoTitle.trim(),
    seoDescription: draft.seoDescription.trim(),
    sections: draft.sections.map(draftToSection),
    status,
  };
}
