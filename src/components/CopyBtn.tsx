import React, { useState } from 'react';

interface CopyBtnProps {
  text: string;
  className?: string;
  label?: string;
}

export default function CopyBtn({ text, className = '', label = 'คัดลอก' }: CopyBtnProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`cursor-pointer flex items-center gap-0.5 transition-all ${className}`}
    >
      <span className="material-symbols-outlined text-[14px]">
        {copied ? 'check' : 'content_copy'}
      </span>
      <span>{copied ? 'คัดลอกแล้ว' : label}</span>
    </button>
  );
}
