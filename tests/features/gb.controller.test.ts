import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/infra/browser/imageLoader', () => ({
  readFileAsArrayBuffer: vi.fn(),
  readFileAsText: vi.fn(),
}));

vi.mock('../../src/infra/canvas/previewRenderer', () => ({ renderIndexedPreview: vi.fn() }));
vi.mock('../../src/infra/canvas/gbSourceRenderer', () => ({ renderGbSourceCanvas: vi.fn() }));

import { initialAppState } from '../../src/app/state';
import type { AppStore } from '../../src/app/store';
import { createGbRuntime } from '../../src/app/runtime/gbRuntime';
import { createOutputRuntime } from '../../src/app/runtime/outputRuntime';
import { createGbController } from '../../src/features/gb/controller';
import { readFileAsArrayBuffer, readFileAsText } from '../../src/infra/browser/imageLoader';
import { createStore } from '../../src/app/store';
import { actions } from '../../src/app/actions';

function createMockStore(state = initialAppState): AppStore & { actions: unknown[] } {
  const actions: unknown[] = [];
  return {
    actions,
    getState() {
      return state;
    },
    dispatch(action) {
      actions.push(action);
    },
    subscribe() {
      return () => {};
    },
  };
}

describe('gb controller', () => {
  afterEach(() => vi.clearAllMocks());

  function createLoadingController() {
    const store = createStore();
    const runtime = createGbRuntime();
    const output = createOutputRuntime();
    const showError = vi.fn();
    const controller = createGbController({
      store,
      runtime,
      output,
      elements: { gbCanvas: {}, previewCanvas: {} } as never,
      host: {
        clearStatus: vi.fn(), showError, clearHistogramView: vi.fn(),
        resetSession: () => {
          store.dispatch(actions.setLoadedType(null));
          store.dispatch(actions.outputClear());
        },
      },
      validateGbBytes: vi.fn(),
    });
    return { controller, store, runtime, output, showError };
  }

  it('keeps the newest binary when an earlier read finishes last', async () => {
    let resolveOld!: (value: ArrayBuffer) => void;
    vi.mocked(readFileAsArrayBuffer)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(new Uint8Array(320).fill(255).buffer);
    const { controller, store, runtime } = createLoadingController();
    const oldLoad = controller.loadBinaryFile(new File([], 'old.gb'));
    await controller.loadBinaryFile(new File([], 'new.gb'));
    resolveOld(new Uint8Array(320).buffer);
    await oldLoad;
    expect(store.getState().output.baseName).toBe('new');
    expect(runtime.rawBytes?.[0]).toBe(255);
    expect(store.getState().output.bmpReady).toBe(true);
  });

  it('does not let an old failed load clear a replacement image session', async () => {
    let rejectOld!: (reason: Error) => void;
    vi.mocked(readFileAsArrayBuffer).mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; }));
    const { controller, store, runtime, showError } = createLoadingController();
    const oldLoad = controller.loadBinaryFile(new File([], 'old.gb'));
    controller.unloadGb();
    store.dispatch(actions.setLoadedType('image'));
    rejectOld(new Error('old read failed'));
    await oldLoad;
    expect(store.getState().loadedType).toBe('image');
    expect(runtime.rawBytes).toBeNull();
    expect(showError).not.toHaveBeenCalled();
  });

  it('cancels a pending printer log when cleared', async () => {
    let resolveText!: (value: string) => void;
    vi.mocked(readFileAsText).mockImplementationOnce(() => new Promise(resolve => { resolveText = resolve; }));
    const { controller, store, runtime, showError } = createLoadingController();
    const loading = controller.loadPrinterFile(new File([], 'old.txt'));
    expect(store.getState().loadedType).toBe('gb');
    controller.unloadGb();
    resolveText('invalid old log');
    await loading;
    expect(store.getState().loadedType).toBeNull();
    expect(runtime.rawBytes).toBeNull();
    expect(showError).not.toHaveBeenCalled();
  });

  it('reports printer-file read failures inline', async () => {
    vi.mocked(readFileAsText).mockRejectedValueOnce(new Error('Unable to read printer log'));
    const { controller, store, showError } = createLoadingController();
    await controller.loadPrinterFile(new File([], 'bad.txt'));
    expect(store.getState().loadedType).toBeNull();
    expect(showError).toHaveBeenCalledWith('Unable to read printer log');
  });

  it('updates GB rotation state', () => {
    const store = createMockStore();
    const elements = {} as unknown as Parameters<typeof createGbController>[0]['elements'];

    const controller = createGbController({
      store,
      elements,
      runtime: createGbRuntime(),
      output: createOutputRuntime(),
      host: {
        clearStatus: vi.fn(),
        showError: vi.fn(),
        clearHistogramView: vi.fn(),
        resetSession: vi.fn(),
      },
      validateGbBytes: vi.fn(),
    });

    controller.setRotation(180);

    expect(store.actions).toContainEqual({ type: 'gb/setRotation', rotation: 180 });
  });

  it('updates GB zoom state', () => {
    const store = createMockStore();
    const controller = createGbController({
      store,
      elements: {} as never,
      runtime: createGbRuntime(),
      output: createOutputRuntime(),
      host: {
        clearStatus: vi.fn(),
        showError: vi.fn(),
        clearHistogramView: vi.fn(),
        resetSession: vi.fn(),
      },
      validateGbBytes: vi.fn(),
    });

    controller.setZoom(3);

    expect(store.actions).toContainEqual({ type: 'gb/setZoom', zoom: 3 });
  });

  it('buildOutput clamps outputScale to device max and dispatches gbSetOutputScale', () => {
    // Art: 160×400 at rotation=0 on X4 (480×800)
    // maxScale = min(floor(480/160), floor(800/400)) = min(3, 2) = 2
    // state has outputScale=3 → should be clamped to 2
    const state = {
      ...initialAppState,
      gb: {
        ...initialAppState.gb,
        outputScale: 3,
        dims: { width: 160, height: 400 },
      },
    };
    const store = createMockStore(state);

    const runtime = createGbRuntime();
    // 160×400 indexed pixel buffer (values 0–3)
    runtime.pixels = new Uint8Array(160 * 400);

    const controller = createGbController({
      store,
      elements: {} as never,
      runtime,
      output: createOutputRuntime(),
      host: {
        clearStatus: vi.fn(),
        showError: vi.fn(),
        clearHistogramView: vi.fn(),
        resetSession: vi.fn(),
      },
      validateGbBytes: vi.fn(),
    });

    controller.buildOutput();

    expect(store.actions).toContainEqual({ type: 'gb/setOutputScale', outputScale: 2 });
  });
});
