'use client';

import { useRef, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function CopyablePre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const codeRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(codeRef.current?.innerText ?? '');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="guide-code">
      <button type="button" className="guide-copy" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre ref={codeRef} {...props}>{children}</pre>
    </div>
  );
}

export function GuideMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CopyablePre }}>
      {markdown}
    </ReactMarkdown>
  );
}
