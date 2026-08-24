export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-primary/30 bg-gold-subtle/50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold-primary">
          <span>سِلائی</span>
          <span>•</span>
          <span>Silaye Workshop OS</span>
        </div>

        <h1 className="font-editorial text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          Your workshop deserves more than a <span className="italic text-primary">notebook.</span>
        </h1>

        <p className="urdu-data-text text-lg text-muted-foreground" dir="rtl">
          ماسٹر درزی اور کٹنگ ورکشاپس کے لیے جدید ترین ڈیجیٹل کسٹمر، ناپ اور کھاتہ مینجمنٹ سسٹم۔
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <div className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground">
            <span className="text-muted-foreground">حالت: </span>
            <span className="font-semibold text-status-ready">تیار برائے ڈیلیوری</span>
          </div>
          <div className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground">
            <span className="text-muted-foreground">قمیض لمبائی: </span>
            <bdi className="font-mono font-bold text-primary">42.50&quot;</bdi>
          </div>
          <div className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground">
            <span className="text-muted-foreground">بقایا رقم: </span>
            <bdi className="font-mono font-bold text-status-udhaar-pending">Rs. 2,500</bdi>
          </div>
        </div>
      </div>
    </main>
  );
}
