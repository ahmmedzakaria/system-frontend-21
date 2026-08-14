export interface ObjectUrlApi { createObjectURL(blob: Blob): string; revokeObjectURL(url: string): void; }

export function triggerBlobDownload(blob: Blob, filename: string, documentRef: Document = document,
                                    urlApi: ObjectUrlApi = URL, schedule: (callback: () => void) => void = callback => setTimeout(callback, 0)): void {
    const url = urlApi.createObjectURL(blob);
    const anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    schedule(() => urlApi.revokeObjectURL(url));
}
