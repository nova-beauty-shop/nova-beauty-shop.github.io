import { describe, expect, it } from 'vitest';
import { INFO_PAGE_LIMITS, emptySectionDraft, toSaveInput, validatePageDraft, type PageDraft } from '@/lib/infoPageDraft';

function draft(overrides: Partial<PageDraft> = {}): PageDraft {
  return {
    title: 'درباره ما',
    lead: 'معرفی',
    seoTitle: '',
    seoDescription: '',
    sections: [],
    ...overrides,
  };
}

describe('validatePageDraft', () => {
  it('accepts a valid page', () => {
    expect(validatePageDraft(draft())).toBeNull();
  });

  it('requires a title', () => {
    expect(validatePageDraft(draft({ title: '   ' }))).toBe('عنوان صفحه را وارد کنید.');
  });

  it('enforces length limits', () => {
    expect(validatePageDraft(draft({ title: 'a'.repeat(INFO_PAGE_LIMITS.title + 1) }))).not.toBeNull();
    expect(validatePageDraft(draft({ lead: 'a'.repeat(INFO_PAGE_LIMITS.lead + 1) }))).not.toBeNull();
    expect(validatePageDraft(draft({ seoTitle: 'a'.repeat(INFO_PAGE_LIMITS.seoTitle + 1) }))).not.toBeNull();
    expect(validatePageDraft(draft({ seoDescription: 'a'.repeat(INFO_PAGE_LIMITS.seoDescription + 1) }))).not.toBeNull();
  });

  it('requires a heading on every section and caps the section count', () => {
    expect(validatePageDraft(draft({ sections: [emptySectionDraft()] }))).toBe('عنوان هر بخش را وارد کنید.');
    const tooMany = Array.from({ length: INFO_PAGE_LIMITS.sections + 1 }, () => ({ ...emptySectionDraft(), heading: 'x' }));
    expect(validatePageDraft(draft({ sections: tooMany }))).toBe('تعداد بخش‌ها بیش از حد مجاز است.');
  });
});

describe('toSaveInput', () => {
  it('trims text and drops empty repeated items', () => {
    const input = toSaveInput(
      'faq',
      draft({
        title: '  عنوان  ',
        sections: [
          {
            heading: ' بخش ',
            paragraphs: 'پاراگراف اول\n\n\n  پاراگراف دوم  ',
            bullets: 'یک\n\n  دو  \n',
            questions: [{ question: '  ', answer: 'بی‌سؤال' }, { question: 'سؤال؟', answer: 'پاسخ' }],
            cards: [{ label: '', value: 'x' }],
          },
        ],
      }),
      'published',
    );

    expect(input.title).toBe('عنوان');
    expect(input.status).toBe('published');
    expect(input.sections[0]).toEqual({
      heading: 'بخش',
      paragraphs: ['پاراگراف اول', 'پاراگراف دوم'],
      bullets: ['یک', 'دو'],
      questions: [{ question: 'سؤال؟', answer: 'پاسخ' }],
    });
  });
});
