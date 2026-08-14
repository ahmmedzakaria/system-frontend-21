import { describe, expect, it, vi } from 'vitest';
import { triggerBlobDownload } from './backup-download';

describe('triggerBlobDownload', () => {
    it('creates, clicks, and revokes the object URL', () => {
        const click = vi.fn();
        const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement;
        const documentRef = { createElement: vi.fn(() => anchor) } as unknown as Document;
        const urlApi = { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() };
        const scheduled: Array<() => void> = [];
        triggerBlobDownload(new Blob(['encrypted']), 'backup.aesgcm', documentRef, urlApi, callback => scheduled.push(callback));
        expect(urlApi.createObjectURL).toHaveBeenCalledOnce();
        expect(click).toHaveBeenCalledOnce();
        expect(anchor.download).toBe('backup.aesgcm');
        expect(urlApi.revokeObjectURL).not.toHaveBeenCalled();
        scheduled[0]();
        expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
});
