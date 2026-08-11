import React from "react";
import { PageContainer } from "@/components/layout";

export default function FrequenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageContainer fullBleed>{children}</PageContainer>;
}
