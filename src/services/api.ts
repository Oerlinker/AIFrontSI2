import axios from 'axios';
import {LoginCredentials, AuthResponse, User} from '@/types/auth';
import {
    Materia,
    Curso,
    Nota,
    Asistencia,
    Participacion,
    Prediccion,
    Periodo,
    DashboardStats
} from '@/types/academic';

// Configuración base de Axios
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
    timeout: 10000,
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// APIs de Autenticación
export const authAPI = {
    login: (credentials: LoginCredentials): Promise<AuthResponse> =>
        api.post('/token/', credentials).then(res => res.data),

    refresh: (refreshToken: string): Promise<{ access: string }> =>
        api.post('/token/refresh/', {refresh: refreshToken}).then(res => res.data),

    getProfile: (): Promise<User> =>
        api.get('/usuarios/profile/').then(res => res.data),
};

// APIs de Usuarios
export const usuariosAPI = {
    getAll: (): Promise<User[]> =>
        api.get('/usuarios/').then(res => res.data),

    getById: (id: number): Promise<User> =>
        api.get(`/usuarios/${id}/`).then(res => res.data),

    create: (userData: Partial<User>): Promise<User> =>
        api.post('/usuarios/', userData).then(res => res.data),

    update: (id: number, userData: Partial<User>): Promise<User> =>
        api.put(`/usuarios/${id}/`, userData).then(res => res.data),

    delete: (id: number): Promise<void> =>
        api.delete(`/usuarios/${id}/`),
};

// APIs de Materias
export const materiasAPI = {
    getAll: (): Promise<Materia[]> =>
        api.get('/materias/').then(res => res.data),

    getById: (id: number): Promise<Materia> =>
        api.get(`/materias/${id}/`).then(res => res.data),

    create: (materia: Partial<Materia>): Promise<Materia> =>
        api.post('/materias/', materia).then(res => res.data),

    update: (id: number, materia: Partial<Materia>): Promise<Materia> =>
        api.put(`/materias/${id}/`, materia).then(res => res.data),

    delete: (id: number): Promise<void> =>
        api.delete(`/materias/${id}/`),
};

// APIs de Cursos
export const cursosAPI = {
    getAll: (): Promise<Curso[]> =>
        api.get('/cursos/').then(res => res.data),

    getById: (id: number): Promise<Curso> =>
        api.get(`/cursos/${id}/`).then(res => res.data),

    create: (curso: Partial<Curso>): Promise<Curso> =>
        api.post('/cursos/', curso).then(res => res.data),

    update: (id: number, curso: Partial<Curso>): Promise<Curso> =>
        api.put(`/cursos/${id}/`, curso).then(res => res.data),

    delete: (id: number): Promise<void> =>
        api.delete(`/cursos/${id}/`),
};

// APIs de Notas
export const notasAPI = {
    getAll: (params?: any): Promise<Nota[]> =>
        api.get('/notas/', {params}).then(res => res.data),

    getById: (id: number): Promise<Nota> =>
        api.get(`/notas/${id}/`).then(res => res.data),

    create: (nota: Partial<Nota>): Promise<Nota> =>
        api.post('/notas/', nota).then(res => res.data),

    update: (id: number, nota: Partial<Nota>): Promise<Nota> =>
        api.put(`/notas/${id}/`, nota).then(res => res.data),

    delete: (id: number): Promise<void> =>
        api.delete(`/notas/${id}/`),
};

// APIs de Asistencias
export const asistenciasAPI = {
    getAll: (params?: any): Promise<Asistencia[]> =>
        api.get('/asistencias/', {params}).then(res => res.data),

    create: (asistencia: Partial<Asistencia>): Promise<Asistencia> =>
        api.post('/asistencias/', asistencia).then(res => res.data),

    update: (id: number, asistencia: Partial<Asistencia>): Promise<Asistencia> =>
        api.put(`/asistencias/${id}/`, asistencia).then(res => res.data),

    delete: (id: number): Promise<void> =>
        api.delete(`/asistencias/${id}/`),
};

// APIs de Participaciones
export const participacionesAPI = {
    getAll: (params?: any): Promise<Participacion[]> =>
        api.get('/participaciones/', {params}).then(res => res.data),

    create: (participacion: Partial<Participacion>): Promise<Participacion> =>
        api.post('/participaciones/', participacion).then(res => res.data),

    update: (id: number, participacion: Partial<Participacion>): Promise<Participacion> =>
        api.put(`/participaciones/${id}/`, participacion).then(res => res.data),

    delete: (id: number): Promise<void> =>
        api.delete(`/participaciones/${id}/`),
};

// APIs de Predicciones
export const prediccionesAPI = {
    getAll: (params?: any): Promise<Prediccion[]> =>
        api.get('/predicciones/', {params}).then(res => res.data),

    generate: (estudianteId: number, materiaId: number): Promise<Prediccion> =>
        api.post('/predicciones/', {estudiante: estudianteId, materia: materiaId}).then(res => res.data),
};

// APIs de Dashboard
export const dashboardAPI = {
    getEstadisticas: (): Promise<DashboardStats> =>
        api.get('/dashboard/estadisticas/').then(res => res.data),
};

// APIs de Periodos
export const periodosAPI = {
    getAll: (): Promise<Periodo[]> =>
        api.get('/periodos/').then(res => res.data),

    getActive: (): Promise<Periodo> =>
        api.get('/periodos/activo/').then(res => res.data),
};

export default api;
