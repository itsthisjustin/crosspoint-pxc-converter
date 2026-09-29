import { afterEach, expect, it, vi } from 'vitest';
import { triggerDownload } from '../../src/infra/browser/downloads';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('attaches the download link and retains its blob until the browser can consume it', () => {
  vi.useFakeTimers();
  const appendChild = vi.fn();
  const anchor = { href: '', download: '', hidden: false, click: vi.fn(), remove: vi.fn() };
  anchor.click.mockImplementation(() => expect(appendChild).toHaveBeenCalledWith(anchor));
  vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild } });
  vi.stubGlobal('window', { setTimeout });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  triggerDownload(new Uint8Array([1, 2]), 'wallpaper.bmp', 'image/bmp');
  expect(anchor.download).toBe('wallpaper.bmp');
  expect(anchor.click).toHaveBeenCalledOnce();
  expect(anchor.remove).toHaveBeenCalledOnce();
  expect(revoke).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:test');
});
