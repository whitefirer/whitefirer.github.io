// Needle 2 on-device inference worker (classic worker — needle.js is not an
// ES module, it only defines the global `createNeedle` via importScripts).
// Keeps WASM inference off the main thread so the terminal UI stays responsive.
importScripts('/lib/needle2/needle.js');

let Module = null;
// The WASM engine keeps a reference to the weights buffer passed to
// needle_load() for the lifetime of the session — it does NOT copy the bytes,
// so this pointer must stay alive (never freed) or the model corrupts.
let weightsPtr = null;
let ready = false;

function strToWasm(str) {
    const bytes = new TextEncoder().encode(str + '\0');
    const ptr = Module._malloc(bytes.length);
    Module.HEAPU8.set(bytes, ptr);
    return ptr;
}

async function load(tools) {
    Module = await createNeedle({
        locateFile: (path) => '/lib/needle2/' + path
    });

    self.postMessage({ type: 'progress', message: 'downloading needle2 weights (14MB, first time only)...' });
    const resp = await fetch('/lib/needle2/needle2.cact');
    if (!resp.ok) throw new Error('needle2.cact fetch failed: HTTP ' + resp.status);
    const bytes = new Uint8Array(await resp.arrayBuffer());

    self.postMessage({ type: 'progress', message: 'loading model into WASM...' });
    weightsPtr = Module._malloc(bytes.length);
    Module.HEAPU8.set(bytes, weightsPtr);
    if (Module._needle_load(weightsPtr, BigInt(bytes.length)) !== 0) {
        throw new Error('needle_load() failed');
    }

    // The official model expects English input (queries are translated to
    // English before reaching it), so advertise locale: en-US — other values
    // combined with an English query make the decoder ramble past the token
    // budget ("tool call truncated: token budget exhausted").
    const today = new Date();
    const dateStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
    const systemPrompt = `date: ${dateStr}; locale: en-US; device: browser`;

    const sPtr = strToWasm(systemPrompt);
    const tPtr = strToWasm(tools);
    const initRet = Module._needle_init(sPtr, tPtr, 0);
    Module._free(sPtr);
    Module._free(tPtr);
    if (initRet < 0) throw new Error('needle_init() returned ' + initRet);

    ready = true;
}

self.onmessage = async (ev) => {
    const { query, tools } = ev.data;
    try {
        if (!ready) {
            await load(tools);
            self.postMessage({ type: 'progress', message: 'thinking' });
        }
        // each query is a fresh session — the engine keeps conversation state
        // and context from previous queries makes routing drift
        Module._needle_reset();

        const inPtr = strToWasm(query);
        const outCap = 32768;
        const outPtr = Module._malloc(outCap);
        Module.HEAPU8.fill(0, outPtr, outPtr + outCap);
        Module._needle_complete(inPtr, 1024, outPtr, outCap);
        Module._free(inPtr);

        let end = outPtr;
        while (end < outPtr + outCap && Module.HEAPU8[end] !== 0) end++;
        const text = new TextDecoder().decode(Module.HEAPU8.subarray(outPtr, end));
        Module._free(outPtr);

        self.postMessage({ type: 'done', out: text });
    } catch (err) {
        self.postMessage({ type: 'error', message: String((err && err.message) || err) });
    }
};
