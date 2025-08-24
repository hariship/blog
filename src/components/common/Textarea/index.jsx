import React from "react";

const Textarea = ({ className = "", ...props }) => {
  return <textarea className={`border px-3 py-2 rounded ${className}`} {...props} />;
};

export default Textarea;