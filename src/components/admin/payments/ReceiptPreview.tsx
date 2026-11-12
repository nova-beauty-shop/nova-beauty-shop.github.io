import { useEffect, useState } from "react";
import { ExternalLink, FileImage } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ReceiptPreview({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function resolveUrl() {
      setLoading(true);
      if (!storagePath) { if (active) { setUrl(null); setLoading(false); } return; }
      if (storagePath.startsWith("data:image/") || storagePath.startsWith("http")) {
        if (active) { setUrl(storagePath); setLoading(false); }
        return;
      }
      try {
        const cached = localStorage.getItem("nova_receipt_path_" + storagePath);
        if (cached && cached.startsWith("data:image/")) {
          if (active) { setUrl(cached); setLoading(false); }
          return;
        }
      } catch {}
      const cleanPath = storagePath.startsWith("receipts/") ? storagePath.slice(9) : storagePath.startsWith("payment-receipts/") ? storagePath.slice(17) : storagePath;
      const { data: signed } = await supabase.storage.from("payment-receipts").createSignedUrl(cleanPath, 3600);
      if (signed?.signedUrl) {
        if (active) { setUrl(signed.signedUrl); setLoading(false); }
        return;
      }
      const { data: signedCatalog } = await supabase.storage.from("catalog-media").createSignedUrl(cleanPath, 3600);
      if (signedCatalog?.signedUrl) {
        if (active) { setUrl(signedCatalog.signedUrl); setLoading(false); }
        return;
      }
      const pub = supabase.storage.from("payment-receipts").getPublicUrl(cleanPath).data.publicUrl;
      if (active) { setUrl(pub); setLoading(false); }
    }
    void resolveUrl();
    return () => { active = false; };
  }, [storagePath]);

  if (loading) {
    return <div className="flex h-36 w-full items-center justify-center rounded-2xl border border-ivory-300 bg-ivory-100 text-xs text-ink-500">در حال بارگذاری تصویر فیش...</div>;
  }
  if (!url) {
    return <div className="flex h-36 w-full items-center justify-center gap-2 rounded-2xl border border-ivory-300 bg-ivory-100 text-xs text-ink-500"><FileImage className="h-4 w-4" /> تصویر فیش یافت نشد</div>;
  }
  return (
    <div className="space-y-2">
      <a href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-soft">
        <img src={url} alt="تصویر فیش واریزی" className="max-h-72 w-full object-contain bg-ivory-50 p-2 transition group-hover:scale-[1.02]" />
        <span className="inline-flex w-full items-center justify-center gap-1.5 border-t border-ivory-200 bg-ivory-50 py-2 text-xs font-bold text-burgundy-700">
          <ExternalLink className="h-3.5 w-3.5" /> مشاهده تصویر کامل فیش
        </span>
      </a>
    </div>
  );
}