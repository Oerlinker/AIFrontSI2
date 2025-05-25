export interface Materia {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string;
    creditos: number;
    profesor: number;
    profesor_detail?: {
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
        curso?: number;
        curso_detail?: Curso;
    };
}

export interface Estudiante {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    curso?: number;
    curso_detail?: Curso;
}

export interface Curso {
    id: number;
    nombre: string;
    nivel: string; // 'PRIMARIA' | 'SECUNDARIA'
    materias: number[];
}

export interface CursoCreate {
    nombre: string;
    nivel: "PRIMARIA" | "SECUNDARIA";
    materias: number[];
    is_active?: boolean;
}

export interface Nota {
    id: number;
    estudiante: number;
    materia: number;
    periodo: number;
    estudiante_detail?: Estudiante;
    materia_detail?: Materia;
    periodo_detail?: Periodo;
    ser_puntaje: number;
    saber_puntaje: number;
    hacer_puntaje: number;
    decidir_puntaje: number;
    autoevaluacion_ser: number;
    autoevaluacion_decidir: number;
    ser_total?: number;
    decidir_total?: number;
    nota_total?: number;
    aprobado?: boolean;
    fecha_registro?: string;
    ultima_modificacion?: string;
    comentario?: string;
}


export interface Asistencia {
    id: number;
    estudiante: number; // El backend usa "estudiante", no "alumno"
    materia: number;
    fecha: string; // ISO date
    presente: boolean;
    justificacion?: string;
}

export interface Participacion {
    id: number;
    estudiante: number; // El backend usa "estudiante", no "alumno"
    materia: number;
    fecha: string; // ISO date
    tipo: string; // 'VOLUNTARIA' | 'SOLICITADA' | 'EJERCICIO' | 'PRESENTACION' | 'DEBATE'
    descripcion?: string;
    valor: number; // Valor de 1 a 10
}

export interface Prediccion {
    id: number;
    estudiante: number;
    materia: number;
    promedio_notas: number;
    porcentaje_asistencia: number;
    promedio_participaciones: number;
    valor_numerico: number;
    nivel_rendimiento: string;
    fecha_prediccion: string;
    confianza: number;
    recomendaciones?: string[];
}


export interface Periodo {
    id: number;
    nombre: string;
    trimestre: string; // 'PRIMERO' | 'SEGUNDO' | 'TERCERO'
    trimestre_display?: string; // Versión legible del trimestre
    año_academico: string; // Formato: "2024-2025"
    fecha_inicio: string; // ISO date
    fecha_fin: string; // ISO date
}

export interface PrediccionDistribucion {
  nivel_rendimiento: string;
  cantidad: number;
}

export interface MateriaStats {
  id: number;
  nombre: string;
  total_estudiantes: number;
  promedio_notas: number;
}

export interface TrimestreStats {
  trimestre: string;
  promedio: number;
  estudiantes: number;
}

export interface DashboardStats {
    total_estudiantes: number;
    total_materias: number;
    promedio_general: number;
    asistencia_promedio: number;
    estudiantes_riesgo: number;
    materias_criticas: string[];
    tendencia_notas: number[];
    predicciones_distribucion: PrediccionDistribucion[];
    materias_stats: MateriaStats[];
    trimestres_stats: TrimestreStats[];
}

export interface EstudianteDashboard {
  id: number;
  nombre: string;
  curso: string;
  promedio_general: number;
  asistencia: number;
  participacion: number;
  rendimiento_por_materia: {
    materia: string;
    promedio: number;
    tendencia: 'SUBIENDO' | 'ESTABLE' | 'BAJANDO';
  }[];
  tendencia_notas: number[];
  prediccion?: {
    nivel_rendimiento: string;
    probabilidad_aprobar: number;
  };
}

export interface ComparativoRendimiento {
  curso_id: number;
  curso_nombre: string;
  promedio_curso: number;
  mejores_estudiantes: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
  promedio_por_materia: {
    materia: string;
    promedio: number;
  }[];
  distribucion_notas: {
    rango: string;
    cantidad: number;
  }[];
}
