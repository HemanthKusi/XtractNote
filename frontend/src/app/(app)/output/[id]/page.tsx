// src/app/(app)/output/[id]/page.tsx
// Route shell for /output/[id]. Unwraps the dynamic id from the App Router
// (params is a Promise in Next 16 → React's use() hook, same as the folder
// detail page) and hands it to SavedContentEditor, which owns all loading,
// state, and the view/edit/copy/export/delete lifecycle.
//
// Lives in the (app) group, so it inherits AppShell + proxy auth protection.

"use client";

import { use } from "react";
import { SavedContentEditor } from "@/components/output/saved-content-editor";

interface OutputPageProps {
  params: Promise<{ id: string }>;
}

export default function OutputPage({ params }: OutputPageProps) {
  const { id } = use(params);
  return <SavedContentEditor id={id} />;
}