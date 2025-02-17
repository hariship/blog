import React from "react";

const Input = ({ className = "", ...props }) => {
  return <input className={`border px-3 py-2 rounded ${className}`} {...props} />;
};

export default Input;