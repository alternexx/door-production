"use client";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
const PipelinePage = dynamic(() => import("@/components/pipeline/pipeline-page").then((m) => m.PipelinePage), { ssr: false });
function PageInner() {
  const searchParams = useSearchParams();
  return <PipelinePage dealType="rental" initialStage={searchParams.get("stage")} />;
}
export default function Page() { return <Suspense><PageInner /></Suspense>; }
