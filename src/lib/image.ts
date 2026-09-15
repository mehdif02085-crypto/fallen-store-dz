import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Product/design images can be either:
 *  - a static path shipped with the app ("/images/products/tee.jpg")
 *  - a private storage object, stored as "storage:<bucket>/<path>"
 * Private objects are served through short-lived signed URLs.
 */
export const STORAGE_PREFIX = "storage:";

export function storageRef(bucket: string, path: string) {
  return `${STORAGE_PREFIX}${bucket}/${path}`;
}

export function parseStorageRef(value: string) {
  if (!value.startsWith(STORAGE_PREFIX)) return null;
  const rest = value.slice(STORAGE_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 1) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

const cache = new Map<string, string>();

export async function resolveImageUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  const ref = parseStorageRef(value);
  if (!ref) return value;
  const cached = cache.get(value);
  if (cached) return cached;
  const { data } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, 60 * 60);
  if (!data?.signedUrl) return null;
  cache.set(value, data.signedUrl);
  return data.signedUrl;
}

export function useImageUrl(value: string | null) {
  const [url, setUrl] = useState<string | null>(() =>
    value && !parseStorageRef(value) ? value : (value ? cache.get(value) ?? null : null),
  );

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(null);
      return;
    }
    if (!parseStorageRef(value)) {
      setUrl(value);
      return;
    }
    void resolveImageUrl(value).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return url;
}
