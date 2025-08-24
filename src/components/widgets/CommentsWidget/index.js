import { useEffect } from "react";

const CommentsWidget = ({ pageSlug }) => {
  useEffect(() => {
    // Ensure the script is executed when component mounts
    const script = document.createElement("script");
    script.src = `${process.env.REACT_APP_BLOG_EXTRAS_URL}/widget.js`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      id="blogextras-comments"
      data-website-id="eb663e71-296b-4665-a1c4-83fba4579887"
      data-page-slug={pageSlug || window.location.pathname}
      data-api-url={process.env.REACT_APP_BLOG_EXTRAS_URL}
    ></div>
  );
};

export default CommentsWidget;