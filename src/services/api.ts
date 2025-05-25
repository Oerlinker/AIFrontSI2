import axios from 'axios';
import { LoginCredentials, AuthResponse, User } from '@/types/auth';
import {
    Materia,
    Curso,
    CursoCreate,
    Nota,
    Asistencia,
    Participacion,
    Prediccion,
    DashboardStats,
    Periodo,
    EstudianteDashboard,
    ComparativoRendimiento
} from '@/types/academic';
import estudiantes from "@/pages/Estudiantes.tsx";


export type FilterParams = {
    estudiante?: number;
    materia?: number;
    curso?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    periodo?: number;
    trimestre?: string;
    año_academico?: string;
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string;
    [key: string]: string | number | boolean | undefined;
};

// Interfaz para Notificacion basada en el modelo del backend
export interface Notificacion {
    id: number;
    usuario: number;
    titulo: string;
    mensaje: string;
    tipo: string; // 'INFO' | 'ALERTA' | 'PREDICCION' | 'RECORDATORIO' | 'SISTEMA'
    estado: string; // 'NO_LEIDA' | 'LEIDA' | 'ARCHIVADA'
    fecha_creacion: string;
    fecha_lectura?: string;
    url_accion?: string;
}

// Interfaz genérica para respuestas paginadas
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// Instancia de Axios
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30000, // Aumentado de 10000 a 30000 ms (30 segundos)
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor para añadir token JWT automáticamente
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    console.error('Error en la configuración de la solicitud:', error);
    return Promise.reject(error);
});

// Interceptor para manejar errores
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Manejar timeout específicamente
        if (error.code === 'ECONNABORTED') {
            console.error('Tiempo de espera agotado para la solicitud:', originalRequest.url);
            return Promise.reject({
                ...error,
                message: 'El servidor está tardando demasiado en responder. Por favor, inténtelo de nuevo más tarde.'
            });
        }

        // Si el error es 401 (Unauthorized) y no es una solicitud de refresh token
        if (error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/usuarios/login/refresh/')) {

            originalRequest._retry = true;

            try {
                // Intentar refrescar el token
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(
                        `${import.meta.env.VITE_API_URL}/usuarios/login/refresh/`,
                        { refresh: refreshToken },
                        { timeout: 15000 } // Timeout específico para refresh token
                    );

                    if (response.data.access) {
                        // Guardar el nuevo token
                        localStorage.setItem('accessToken', response.data.access);

                        // Actualizar el token en la solicitud original y reintentarla
                        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
                        return axios(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error('Error al refrescar el token:', refreshError);

                // Si hay un error al refrescar, redirigir al login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.dispatchEvent(new CustomEvent('auth:logout'));

                return Promise.reject({
                    ...error,
                    message: 'Su sesión ha expirado. Por favor, inicie sesión de nuevo.'
                });
            }
        }

        // Manejo específico de errores de red
        if (!error.response) {
            console.error('Error de red o servidor no disponible');
            return Promise.reject({
                ...error,
                message: 'No se puede conectar con el servidor. Verifique su conexión a internet.'
            });
        }

        // Propagar el error si no se puede manejar
        return Promise.reject(error);
    }
);

// Métodos de la API
const api = {
    // Autenticación
    login: (credentials: LoginCredentials): Promise<AuthResponse> =>
        axiosInstance.post('/usuarios/login/', credentials).then(res => res.data),
    refreshToken: (refresh: string): Promise<AuthResponse> =>
        axiosInstance.post('/usuarios/login/refresh/', { refresh }).then(res => res.data),
    getProfile: (): Promise<User> =>
        axiosInstance.get('/usuarios/perfil/').then(res => res.data),

    // Usuarios
    fetchUsuarios: (filters?: { rol?: string; [key: string]: any}): Promise<User[]> =>
        axiosInstance.get('/usuarios/lista/', { params: filters }).then(res => res.data),
    createUsuario: (data: Omit<User, 'id'>): Promise<User> =>
        axiosInstance.post('/usuarios/registro/', data).then(res => res.data),
    updateUsuario: (id: number, data: Partial<User>): Promise<User> =>
        axiosInstance.put(`/usuarios/perfil/`, data).then(res => res.data),
    deleteUsuario: (id: number): Promise<void> =>
        axiosInstance.delete(`/usuarios/${id}/`).then(() => {}),

    // Materias
    fetchMaterias: (): Promise<Materia[]> =>
        axiosInstance.get('/materias/').then(res => res.data),
    getMateriaById: (id: number): Promise<Materia> =>
        axiosInstance.get(`/materias/${id}/`).then(res => res.data),
    createMateria: (data: Omit<Materia, 'id' | 'profesor_detail'>): Promise<Materia> =>
        axiosInstance.post('/materias/', data).then(res => res.data),
    updateMateria: (id: number, data: Partial<Materia>): Promise<Materia> =>
        axiosInstance.put(`/materias/${id}/`, data).then(res => res.data),
    deleteMateria: (id: number): Promise<void> =>
        axiosInstance.delete(`/materias/${id}/`).then(() => {}),

    // Cursos
    fetchCursos: (): Promise<Curso[]> =>
        axiosInstance.get('/cursos/').then(res => res.data),
    getCursoById: (id: number): Promise<Curso> =>
        axiosInstance.get(`/cursos/${id}/`).then(res => res.data),
    createCurso: (data: CursoCreate): Promise<Curso> =>
        axiosInstance.post('/cursos/', data).then(res => res.data),
    updateCurso: (id: number, data: Partial<CursoCreate>): Promise<Curso> =>
        axiosInstance.put(`/cursos/${id}/`, data).then(res => res.data),
    deleteCurso: (id: number): Promise<void> =>
        axiosInstance.delete(`/cursos/${id}/`).then(() => {}),

    // Periodos
    fetchPeriodos: (): Promise<Periodo[]> =>
        axiosInstance.get('/notas/periodos/').then(res => res.data),
    getPeriodoById: (id: number): Promise<Periodo> =>
        axiosInstance.get(`/notas/periodos/${id}/`).then(res => res.data),
    createPeriodo: (data: Omit<Periodo, 'id' | 'trimestre_display'>): Promise<Periodo> =>
        axiosInstance.post('/notas/periodos/', data).then(res => res.data),
    updatePeriodo: (id: number, data: Partial<Omit<Periodo, 'id' | 'trimestre_display'>>): Promise<Periodo> =>
        axiosInstance.put(`/notas/periodos/${id}/`, data).then(res => res.data),
    deletePeriodo: (id: number): Promise<void> =>
        axiosInstance.delete(`/notas/periodos/${id}/`).then(() => {}),

    // Notas (anteriormente llamado Calificaciones)
    fetchNotas: (filters?: FilterParams): Promise<Nota[]> =>
        axiosInstance.get('/notas/calificaciones/', { params: filters }).then(res => res.data),
    getNotaById: (id: number): Promise<Nota> =>
        axiosInstance.get(`/notas/calificaciones/{id}/`).then(res => res.data),
    createNota: (data: Omit<Nota, 'id' | 'estudiante_detail' | 'materia_detail' | 'periodo_detail' | 'ser_total' | 'decidir_total' | 'nota_total' | 'aprobado' | 'fecha_registro' | 'ultima_modificacion'>): Promise<Nota> =>
        axiosInstance.post('/notas/calificaciones/', data).then(res => res.data),
    updateNota: (id: number, data: Partial<Nota>): Promise<Nota> =>
        axiosInstance.put(`/notas/calificaciones/{id}/`, data).then(res => res.data),
    deleteNota: (id: number): Promise<void> =>
        axiosInstance.delete(`/notas/calificaciones/{id}/`).then(() => {}),

    // Asistencias
    fetchAsistencias: (filters?: FilterParams): Promise<Asistencia[]> =>
        axiosInstance.get('/asistencias/', { params: filters }).then(res => res.data),
    getAsistenciaById: (id: number): Promise<Asistencia> =>
        axiosInstance.get(`/asistencias/${id}/`).then(res => res.data),
    recordAsistencia: (data: Omit<Asistencia, 'id'>): Promise<Asistencia> =>
        axiosInstance.post('/asistencias/', data).then(res => res.data),
    updateAsistencia: (id: number, data: Partial<Asistencia>): Promise<Asistencia> =>
        axiosInstance.put(`/asistencias/${id}/`, data).then(res => res.data),
    deleteAsistencia: (id: number): Promise<void> =>
        axiosInstance.delete(`/asistencias/${id}/`).then(() => {}),

    // Participaciones
    fetchParticipaciones: (filters?: FilterParams): Promise<Participacion[]> =>
        axiosInstance.get('/participaciones/', { params: filters }).then(res => res.data),
    getParticipacionById: (id: number): Promise<Participacion> =>
        axiosInstance.get(`/participaciones/${id}/`).then(res => res.data),
    recordParticipacion: (data: Omit<Participacion, 'id'>): Promise<Participacion> =>
        axiosInstance.post('/participaciones/', data).then(res => res.data),
    updateParticipacion: (id: number, data: Partial<Participacion>): Promise<Participacion> =>
        axiosInstance.put(`/participaciones/${id}/`, data).then(res => res.data),
    deleteParticipacion: (id: number): Promise<void> =>
        axiosInstance.delete(`/participaciones/${id}/`).then(() => {}),

    // Predicciones
    fetchPredicciones: (filters?: FilterParams): Promise<Prediccion[]> =>
        axiosInstance.get('/predicciones/', { params: filters }).then(res => res.data),
    getPrediccionById: (id: number): Promise<Prediccion> =>
        axiosInstance.get(`/predicciones/${id}/`).then(res => res.data),
    createPrediccion: (data: { estudiante: number, materia: number }): Promise<Prediccion> =>
        axiosInstance.post('/predicciones/generar_prediccion/', data).then(res => res.data),

    // Dashboard
    fetchDashboardGeneral: (): Promise<DashboardStats> =>
        axiosInstance.get('/dashboard/general/').then(res => res.data),
    fetchDashboardEstadisticas: (): Promise<DashboardStats> =>
        axiosInstance.get('/dashboard/estadisticas/').then(res => res.data),
    fetchEstudianteDashboard: (estudianteId?: number): Promise<EstudianteDashboard> => {
        const url = estudianteId
            ? `/dashboard/estudiante/${estudianteId}/`
            : '/dashboard/estudiante/';
        return axiosInstance.get(url).then(res => res.data);
    },
    fetchComparativoRendimiento: (): Promise<ComparativoRendimiento> =>
        axiosInstance.get('/dashboard/comparativo/').then(res => res.data),

    // Notificaciones
    fetchNotificaciones: (): Promise<Notificacion[]> =>
        axiosInstance.get('/notificaciones/').then(res => res.data),
    getNotificacionById: (id: number): Promise<Notificacion> =>
        axiosInstance.get(`/notificaciones/${id}/`).then(res => res.data),
    createNotificacion: (data: Omit<Notificacion, 'id' | 'fecha_creacion' | 'fecha_lectura'>): Promise<Notificacion> =>
        axiosInstance.post('/notificaciones/', data).then(res => res.data),
    updateNotificacion: (id: number, data: Partial<Notificacion>): Promise<Notificacion> =>
        axiosInstance.put(`/notificaciones/${id}/`).then(res => res.data),
    marcarNotificacionComoLeida: (id: number): Promise<Notificacion> =>
        axiosInstance.post(`/notificaciones/${id}/marcar_como_leida/ `, {}).then(res => res.data),
    deleteNotificacion: (id: number): Promise<void> =>
        axiosInstance.delete(`/notificaciones/${id}/`).then(() => {}),
};

export default api;
