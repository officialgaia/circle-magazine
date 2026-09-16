// 新しいタブを開かず、ブラウザに直接ダウンロードさせるための共通ヘルパー。
// アップロード時に Content-Disposition: attachment を付けているため、
// 通常のリンククリックと同じ扱いで保存ダイアログ/ダウンロードが始まる。
export function triggerDownload(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
