// src/lib/pdf.ts
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Served statically from /public (see public/pdf.worker.mjs below)
GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

export async function pdfToText(file: File, pageLimit = 30): Promise<string> {
  const ab = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(ab) }).promise;

  const max = Math.min(pdf.numPages, pageLimit);
  let all = "";

  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const content: any = await page.getTextContent();
    const strings = content.items.map((it: any) => ("str" in it ? it.str : String(it?.toString?.() ?? "")));
    all += strings.join(" ") + "\n\n";
  }

  if (pdf.numPages > pageLimit) {
    all += `\n\n[Note: Truncated at ${pageLimit} pages of ${pdf.numPages}.]`;
  }

  await pdf.cleanup();
  return all.trim();
}
