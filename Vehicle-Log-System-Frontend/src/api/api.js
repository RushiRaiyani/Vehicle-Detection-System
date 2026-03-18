// const API_BASE = "/api";
const API_BASE = import.meta.env.VITE_API_URL;


async function request(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
}

// ─── Auth ────────────────────────────────────────────────────────────
export const authAPI = {
    signup: (body) => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
    login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
};

// ─── Collections ─────────────────────────────────────────────────────
export const collectionsAPI = {
    list: () => request("/collections"),
    get: (id) => request(`/collections/${id}`),
    create: (name) => request("/collections", { method: "POST", body: JSON.stringify({ name }) }),
    join: (groupCode) => request("/collections/join", { method: "POST", body: JSON.stringify({ groupCode }) }),
    delete: (id) => request(`/collections/${id}`, { method: "DELETE" }),
};

// ─── Logs ────────────────────────────────────────────────────────────
export const logsAPI = {
    getByCollection: (collectionId) => request(`/logs/${collectionId}`),
    create: (body) => request("/logs", { method: "POST", body: JSON.stringify(body) }),
    delete: (id) => request(`/logs/${id}`, { method: "DELETE" }),
};

// ─── Detection ───────────────────────────────────────────────────────
export const detectAPI = {
    image: async (file) => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_BASE}/detect/image`, {
            method: "POST",
            credentials: "include",
            body: form,
        });
        if (!res.ok) {
            let msg = "Detection failed";
            try { const data = await res.json(); msg = data.error || msg; } catch { /* HTML error page */ }
            throw new Error(msg);
        }
        return res.json();
    },

    // Legacy non-streaming video (kept as fallback)
    video: async (file) => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_BASE}/detect/video`, {
            method: "POST",
            credentials: "include",
            body: form,
        });
        if (!res.ok) {
            let msg = "Detection failed";
            try { const data = await res.json(); msg = data.error || msg; } catch {
                msg = "The uploaded video is too long or the server encountered an error. Please try a shorter video.";
            }
            throw new Error(msg);
        }
        return res.json();
    },

    /**
     * SSE-based video detection streaming.
     * Posts the file, then reads the text/event-stream response.
     * @param {File} file 
     * @param {{ onPlate, onProgress, onDone, onError }} callbacks
     * @returns {AbortController} - call .abort() to cancel
     */
    videoStream: (file, { onPlate, onProgress, onDone, onError }) => {
        const controller = new AbortController();
        const form = new FormData();
        form.append("file", file);

        fetch(`${API_BASE}/detect/video/stream`, {
            method: "POST",
            credentials: "include",
            body: form,
            signal: controller.signal,
        })
            .then(async (res) => {
                if (!res.ok || !res.body) {
                    let msg = "Video processing failed";
                    try { const d = await res.json(); msg = d.error || msg; } catch {
                        msg = "The uploaded video is too long or the server encountered an error. Please try a shorter video.";
                    }
                    onError?.(msg);
                    return;
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Parse SSE events from buffer
                    const parts = buffer.split("\n\n");
                    buffer = parts.pop(); // keep incomplete chunk

                    for (const part of parts) {
                        if (!part.trim()) continue;
                        let eventType = "message";
                        let dataStr = "";

                        for (const line of part.split("\n")) {
                            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
                            else if (line.startsWith("data: ")) dataStr = line.slice(6);
                        }

                        if (!dataStr) continue;

                        try {
                            const data = JSON.parse(dataStr);
                            switch (eventType) {
                                case "plate": onPlate?.(data); break;
                                case "progress": onProgress?.(data); break;
                                case "done": onDone?.(data); break;
                                case "error": onError?.(data.error || "Unknown error"); break;
                            }
                        } catch { /* skip unparseable */ }
                    }
                }
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                onError?.(err.message || "Connection lost during video processing");
            });

        return controller;
    },

    getOutputUrl: (filename) => `${API_BASE}/detect/output/${filename}`,
};

