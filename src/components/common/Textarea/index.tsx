import React, { FC, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const Textarea: FC<TextareaProps> = ({ className = "", ...props }) => {
  return <textarea className={`border px-3 py-2 rounded ${className}`} {...props} />;
};

export default Textarea;