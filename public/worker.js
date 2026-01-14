// Web Worker to handle game loop timing
// This runs in a separate thread and isn't throttled when the tab is inactive (unlike main thread setInterval)

let intervalId = null;

self.onmessage = function (e) {
    if (e.data === 'start') {
        if (!intervalId) {
            intervalId = setInterval(() => {
                self.postMessage('tick');
            }, 500); // Poll every 500ms for snappier turn-end detection
        }
    } else if (e.data === 'stop') {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
};
