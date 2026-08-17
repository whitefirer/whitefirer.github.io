// Needle on-device inference worker — keeps WASM inference off the main thread
// so the terminal UI (spinner, rendering) stays responsive during queries.
import init, { NeedleWasm } from '/lib/needle-rs/needle_wasm.js';

let engine = null;

self.onmessage = async (ev) => {
    const { query, tools } = ev.data;
    try {
        if (!engine) {
            await init();
            self.postMessage({ type: 'progress', message: 'downloading weights (22MB, first time only)...' });
            const [wRes, vRes] = await Promise.all([
                fetch('/lib/needle-rs/weights/needle.safetensors'),
                fetch('/lib/needle-rs/weights/vocab.txt')
            ]);
            const [wBuf, vText] = await Promise.all([wRes.arrayBuffer(), vRes.text()]);
            self.postMessage({ type: 'progress', message: 'loading model into WASM...' });
            engine = NeedleWasm.load(new Uint8Array(wBuf), vText);
            if (!engine) throw new Error('NeedleWasm.load() failed');
        }
        const out = engine.run_stream(query, tools, (_id, piece) => {
            self.postMessage({ type: 'token', piece });
        });
        self.postMessage({ type: 'done', out });
    } catch (err) {
        self.postMessage({ type: 'error', message: String((err && err.message) || err) });
    }
};
