
import { User } from './auth';

export interface Materia {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  curso: number;
  profesor: number;
  profesor_nombre?: string;
  is_active: boolean;
}

export interface Curso {
  id: number;
  nombre: string;
  nivel: string;
  paralelo: string;
  año_lectivo: string;
  is_active: boolean;
  estudiantes?: User[];
}

export interface Nota {
  id: number;
  estudiante: number;
  materia: number;
  periodo: number;
  ser: number;
  saber: number;
  hacer: number;
  decidir: number;
  promedio: number;
  autoevaluacion?: number;
  fecha_registro: string;
}

export interface Asistencia {
  id: number;
  estudiante: number;
  materia: number;
  fecha: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'JUSTIFICADO';
  observaciones?: string;
}

export interface Participacion {
  id: number;
  estudiante: number;
  materia: number;
  fecha: string;
  tipo: 'VOLUNTARIA' | 'SOLICITADA' | 'EJERCICIO' | 'EXPOSICION';
  calidad: 'EXCELENTE' | 'BUENA' | 'REGULAR' | 'DEFICIENTE';
  observaciones?: string;
}

export interface Prediccion {
  id: number;
  estudiante: number;
  materia: number;
  promedio_notas: number;
  porcentaje_asistencia: number;
  promedio_participaciones: number;
  prediccion_rendimiento: number;
  recomendaciones: string[];
  fecha_prediccion: string;
}

export interface Periodo {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  is_active: boolean;
}

export interface DashboardStats {
  total_estudiantes: number;
  total_materias: number;
  total_cursos: number;
  promedio_general: number;
  asistencia_promedio: number;
  estudiantes_riesgo: number;
  materias_criticas: string[];
  tendencia_notas: number[];
}
