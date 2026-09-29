import type { AppDom } from './dom';

type DownloadButtonDeps = {
  dom: AppDom;
  onDownloadBmp: () => void;
};

export function bindDownloadButtons(deps: DownloadButtonDeps): void {
  deps.dom.downloadBmpBtn.addEventListener('click', deps.onDownloadBmp);
}
