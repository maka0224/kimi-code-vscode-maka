import { useEffect, useState } from "react";

export function useExtensionImageUrl(imageName: string): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const baseUri = document.body.getAttribute("data-baseuri");
    if (baseUri) {
      setUrl(`${baseUri}/resources/${imageName}`);
    }
  }, [imageName]);

  return url;
}
