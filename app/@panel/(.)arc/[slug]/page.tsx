import { ArcPanel } from "@/components/arc-panel";
import { loadArc } from "@/lib/arcs/load-arc";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function InterceptedArcPanelPage({ params }: Props) {
  const { slug } = await params;
  const result = await loadArc({ slug });
  return <ArcPanel result={result} />;
}
