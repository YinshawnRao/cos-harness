"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PublicSettings } from "@/lib/settings/schema";

export type BucketItem = {
  name: string;
  location?: string;
  creationDate?: string;
};

export type ObjectItem = {
  key: string;
  size: number;
  lastModified?: string;
  storageClass?: string;
  isImage: boolean;
  thumbnailUrl?: string;
};

export type PrefixItem = { prefix: string };

export type ProcessResult = {
  originalUrl: string;
  processedUrl: string;
  targetKey?: string;
  sourceKey: string;
  mode: string;
  rule?: string;
};

type StudioContextValue = {
  settings: PublicSettings | null;
  buckets: BucketItem[];
  bucket: string;
  prefix: string;
  prefixes: PrefixItem[];
  objects: ObjectItem[];
  selectedKey: string | null;
  agentOpen: boolean;
  libraryWidth: number;
  loadingList: boolean;
  listError: string | null;
  seedPrompt: string | null;
  processResult: ProcessResult | null;
  setAgentOpen: (open: boolean) => void;
  setLibraryWidth: (width: number) => void;
  setSeedPrompt: (prompt: string | null) => void;
  setProcessResult: (result: ProcessResult | null) => void;
  selectBucket: (name: string) => void;
  openPrefix: (prefix: string) => void;
  selectObject: (key: string | null) => void;
  refresh: (
    overrides?: { bucket?: string; prefix?: string },
    nextSettings?: PublicSettings,
  ) => Promise<void>;
  loadSettings: () => Promise<PublicSettings>;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio() {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used within StudioProvider");
  return value;
}

export function StudioProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings: PublicSettings;
}) {
  const [settings, setSettings] = useState<PublicSettings | null>(initialSettings);
  const [buckets, setBuckets] = useState<BucketItem[]>([]);
  const [bucket, setBucket] = useState(initialSettings.tencent.bucket);
  const [prefix, setPrefix] = useState("");
  const [prefixes, setPrefixes] = useState<PrefixItem[]>([]);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(true);
  const [libraryWidth, setLibraryWidth] = useState(300);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);

  const loadSettings = useCallback(async () => {
    const response = await fetch("/api/settings");
    const data = (await response.json()) as PublicSettings & { error?: string };
    if (!response.ok) throw new Error(data.error || "读取设置失败");
    setSettings(data);
    if (data.tencent.bucket) setBucket((current) => current || data.tencent.bucket);
    return data;
  }, []);

  const refresh = useCallback(async (
    overrides?: { bucket?: string; prefix?: string },
    nextSettings?: PublicSettings,
  ) => {
    const nextBucket = overrides?.bucket ?? bucket;
    const nextPrefix = overrides?.prefix ?? prefix;
    const configured = (nextSettings ?? settings)?.tencent.secretIdSet;
    if (!configured) {
      setBuckets([]);
      setObjects([]);
      setPrefixes([]);
      return;
    }
    setLoadingList(true);
    setListError(null);
    try {
      const bucketsRes = await fetch("/api/cos/buckets");
      const bucketsData = await bucketsRes.json();
      if (!bucketsRes.ok) throw new Error(bucketsData.error || "列出存储桶失败");
      setBuckets(bucketsData.buckets || []);
      const resolvedBucket =
        nextBucket || bucketsData.defaultBucket || bucketsData.buckets?.[0]?.name;
      if (resolvedBucket && resolvedBucket !== bucket) setBucket(resolvedBucket);
      if (!resolvedBucket) return;
      const params = new URLSearchParams({ bucket: resolvedBucket, prefix: nextPrefix });
      const listRes = await fetch(`/api/cos/objects?${params}`);
      const listed = await listRes.json();
      if (!listRes.ok) throw new Error(listed.error || "列出对象失败");
      setObjects(listed.objects || []);
      setPrefixes(listed.prefixes || []);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "加载资源失败");
    } finally {
      setLoadingList(false);
    }
  }, [bucket, prefix, settings]);

  const selectBucket = useCallback(
    (name: string) => {
      setBucket(name);
      setPrefix("");
      setSelectedKey(null);
      setProcessResult(null);
      void refresh({ bucket: name, prefix: "" });
    },
    [refresh],
  );

  const openPrefix = useCallback(
    (next: string) => {
      setPrefix(next);
      setSelectedKey(null);
      setProcessResult(null);
      void refresh({ prefix: next });
    },
    [refresh],
  );

  const selectObject = useCallback((key: string | null) => {
    setSelectedKey(key);
    setProcessResult(null);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      buckets,
      bucket,
      prefix,
      prefixes,
      objects,
      selectedKey,
      agentOpen,
      libraryWidth,
      loadingList,
      listError,
      seedPrompt,
      processResult,
      setAgentOpen,
      setLibraryWidth,
      setSeedPrompt,
      setProcessResult,
      selectBucket,
      openPrefix,
      selectObject,
      refresh,
      loadSettings,
    }),
    [
      settings,
      buckets,
      bucket,
      prefix,
      prefixes,
      objects,
      selectedKey,
      agentOpen,
      libraryWidth,
      loadingList,
      listError,
      seedPrompt,
      processResult,
      selectBucket,
      openPrefix,
      selectObject,
      refresh,
      loadSettings,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
