import { router } from 'expo-router';
import { API_URL } from '../config';
import { clearSession, loadSession } from './auth';

const request = async (method, path, body = null) => {
    const session = await loadSession();
    const token = session?.token ?? null;

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${path}`, options);

    if (res.status === 401) {
        await clearSession();
        if (!path.includes('/login')) router.replace('/(auth)/login');
        throw new Error('Session expirée.');
    }

    const text = await res.text();
    let json = null;

    if (text) {
        try {
            json = JSON.parse(text);
        } catch (e) {
            throw new Error(`Réponse serveur invalide (status ${res.status})`);
        }
    }

    if (!res.ok) {
        const errorMsg = json?.message || json?.error || `Erreur serveur (${res.status})`;
        throw new Error(errorMsg);
    }

    if (!json) {
        return { success: true };
    }

    if (json.success === undefined) {
        if (typeof json.code === 'number') {
            json.success = json.code >= 200 && json.code < 300;
        } else {
            json.success = true;
        }
    }

    return json;
};

const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
};

export default api;