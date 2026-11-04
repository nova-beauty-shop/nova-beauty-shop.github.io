import { toAdminWriteError } from '@/lib/adminWriteErrors';
import { supabase } from '@/lib/supabase';

export type QuestionFilter = 'pending' | 'published' | 'all';

export interface AdminQuestion {
  id: string;
  productName: string;
  question: string;
  answer: string | null;
  isPublished: boolean;
  createdAt: string;
}

type Row = Record<string, unknown>;

export async function fetchAdminQuestions(filter: QuestionFilter): Promise<AdminQuestion[]> {
  let request = supabase
    .from('product_questions')
    .select('id, question, answer, is_published, created_at, product:products(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter === 'pending') request = request.eq('is_published', false);
  if (filter === 'published') request = request.eq('is_published', true);

  const { data, error } = await request;
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected questions response');
  return data.map((raw) => {
    const row = raw as Row;
    const product = row.product as Row | null;
    return {
      id: String(row.id),
      productName: typeof product?.name === 'string' ? product.name : 'محصول حذف‌شده',
      question: String(row.question ?? ''),
      answer: typeof row.answer === 'string' ? row.answer : null,
      isPublished: row.is_published === true,
      createdAt: String(row.created_at ?? ''),
    };
  });
}

export async function publishAnswer(id: string, answer: string): Promise<void> {
  const { error } = await supabase
    .from('product_questions')
    .update({ answer: answer.trim(), answered_at: new Date().toISOString(), is_published: true })
    .eq('id', id);
  if (error) throw toAdminWriteError(error);
}

export async function hideQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('product_questions').update({ is_published: false }).eq('id', id);
  if (error) throw toAdminWriteError(error);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('product_questions').delete().eq('id', id);
  if (error) throw toAdminWriteError(error);
}
