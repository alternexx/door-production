"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const PipelinePage = dynamic(
  () => import("@/components/pipeline/pipeline-page").then((m) => m.PipelinePage),
  { ssr: false }
);

export default function Page() {
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage");
  return <PipelinePage dealType="rental" initialStage={stage} />;
}
