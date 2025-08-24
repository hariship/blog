import React, { FC, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input: FC<InputProps> = ({ className = "", ...props }) => {
  return <input className={`border px-3 py-2 rounded ${className}`} {...props} />;
};

export default Input;