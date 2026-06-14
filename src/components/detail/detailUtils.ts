export type ImageAsset = {
  path: string;
  url?: string;
};

export function imageAssets(paths: string[] | undefined, urls: string[] | undefined): ImageAsset[] {
  return (paths || []).map((path, index) => ({ path, url: urls?.[index] })).filter((asset) => asset.path);
}

export function fileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}
