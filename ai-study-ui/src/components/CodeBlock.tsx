"use client";

import React, { useRef, useState } from "react";

export default function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="relative my-3 border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b bg-gray-50">
        <span className="font-mono">{lang || "code"}</span>
        <button
          onClick={onCopy}
          className="rounded border px-2 py-[2px] text-xs hover:bg-white"
          title="Copy code"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre ref={ref} className="overflow-x-auto p-3 bg-gray-50">
        <code className="block font-mono text-[12.5px] leading-5 whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}
