import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          danish.ink
        </h1>
        <p className="text-lg text-muted-foreground">Digest coming soon.</p>
      </div>
      <Button variant="outline" disabled>
        Read latest digest
      </Button>
    </main>
  );
}
