export type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export type ReleaseInfo = {
  version: string;
  releaseUrl: string;
  publishedAt: string | null;
  body: string;
  assets: ReleaseAsset[];
};

const OWNER = 'oshtz';
const REPO = 'tagmeister';
const LATEST_RELEASE_ENDPOINT = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

const normalizeVersion = (value: string): string => value.trim().replace(/^v/i, '');

const parseVersionParts = (value: string): number[] =>
  normalizeVersion(value)
    .split('.')
    .map(part => {
      const parsed = parseInt(part, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });

export const compareVersions = (current: string, candidate: string): number => {
  const currentParts = parseVersionParts(current);
  const candidateParts = parseVersionParts(candidate);
  const maxLength = Math.max(currentParts.length, candidateParts.length);

  for (let i = 0; i < maxLength; i += 1) {
    const diff = (currentParts[i] ?? 0) - (candidateParts[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
};

export const fetchLatestRelease = async (): Promise<ReleaseInfo> => {
  const response = await fetch(LATEST_RELEASE_ENDPOINT, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `GitHub release lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  const assets = Array.isArray(payload?.assets)
    ? payload.assets
        .filter((asset: any) => typeof asset?.name === 'string' && typeof asset?.browser_download_url === 'string')
        .map((asset: any) => ({
          name: asset.name as string,
          browser_download_url: asset.browser_download_url as string,
        }))
    : [];

  const version = typeof payload?.tag_name === 'string'
    ? normalizeVersion(payload.tag_name)
    : typeof payload?.name === 'string'
      ? normalizeVersion(payload.name)
      : '0.0.0';

  return {
    version,
    releaseUrl: typeof payload?.html_url === 'string' ? payload.html_url : `https://github.com/${OWNER}/${REPO}/releases`,
    publishedAt: typeof payload?.published_at === 'string' ? payload.published_at : null,
    body: typeof payload?.body === 'string' ? payload.body : '',
    assets,
  };
};

export type PlatformDownloadLinks = {
  windows?: string | null;
  macos?: string | null;
};

const assetMatches = (assetName: string, ...keywords: string[]): boolean => {
  const lower = assetName.toLowerCase();
  return keywords.some(keyword => lower.includes(keyword));
};

export const selectPlatformDownloads = (assets: ReleaseAsset[]): PlatformDownloadLinks => {
  const findAssetUrl = (predicate: (asset: ReleaseAsset) => boolean): string | null => {
    const match = assets.find(predicate);
    return match ? match.browser_download_url : null;
  };

  const windows = findAssetUrl(asset =>
    asset.name.toLowerCase().endsWith('.exe') ||
    assetMatches(asset.name, 'windows', 'win32', 'win64', 'msi')
  );

  const macos = findAssetUrl(asset =>
    asset.name.toLowerCase().endsWith('.dmg') ||
    assetMatches(asset.name, 'macos', 'darwin', 'mac', 'osx')
  );

  return { windows, macos };
};
