import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
// import { Prediccion, Materia } from '@/types/academic';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import {
  BrainCircuit, Loader2, ArrowUpRight, TrendingUp, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface PrediccionFormData {
  estudiante: number;
  materia: number;
  promedio_notas?: number;
  porcentaje_asistencia?: number;
  promedio_participaciones?: number;
  valor_numerico?: number;
  nivel_rendimiento?: string;
  confianza?: number;
}

interface Materia {
  id: number;
  nombre: string;
  codigo: string;
  profesor?: number;
}

interface Prediccion {
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

interface Curso {
  id: number;
  nombre: string;
  materias?: number[];
}

const PrediccionRendimiento: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<number | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentPrediccion, setCurrentPrediccion] = useState<Prediccion | null>(null);
  const [recomendaciones, setRecomendaciones] = useState<string[]>([]);

  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';

  const { data: materias = [], isFetching: isFetchingMaterias } = useQuery({
    queryKey: ['materias-profesor'],
    queryFn: async () => {
      const allMaterias = await api.fetchMaterias();
      return isProfesor ? allMaterias.filter((m: Materia) => m.profesor === user?.id) : allMaterias;
    },
    // keepPreviousData: true,
  });

  const { data: cursos = [], isFetching: isFetchingCursos } = useQuery({
    queryKey: ['cursos'],
    queryFn: api.fetchCursos,
  });

  const cursosDisponibles = useMemo(() => {
    if (!selectedMateria) return [];
    return cursos.filter((curso: Curso) => curso.materias?.includes(selectedMateria));
  }, [selectedMateria, cursos]);

  useEffect(() => {
    if (cursosDisponibles.length > 0 && !selectedCurso) {
      setSelectedCurso(cursosDisponibles[0].id);
    }
  }, [cursosDisponibles, selectedCurso]);

  const { data: estudiantes = [], isFetching: isFetchingEstudiantes } = useQuery<User[]>({
    queryKey: ['estudiantes', selectedCurso],
    queryFn: async () => {
      if (!selectedCurso) return [];
      return api.fetchEstudiantes({ curso: selectedCurso });
    },
    enabled: !!selectedCurso,
  });

  const { data: predicciones = [], isFetching: isFetchingPredicciones } = useQuery<Prediccion[]>({
    queryKey: ['predicciones', selectedMateria],
    queryFn: async () => {
      if (!selectedMateria) return []; // Devuelve un array vacío si no hay materia seleccionada
      return api.fetchPredicciones({ materia: selectedMateria });
    },
    enabled: !!selectedMateria,
  });

  const createPrediccionMutation = useMutation({
    mutationFn: (data: PrediccionFormData) => api.createPrediccion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predicciones', selectedMateria] });
      toast({ title: "Predicción generada", description: "El modelo IA ha completado la predicción." });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar la predicción." });
    },
  });

  const isLoading = isFetchingMaterias || isFetchingCursos || isFetchingEstudiantes || isFetchingPredicciones;

  const estudiantesSinPrediccion = useMemo(() => {
    const conPred = new Set(predicciones.map(p => p.estudiante));
    return estudiantes.filter((e: User) => !conPred.has(e.id));
  }, [estudiantes, predicciones]);

  const getNivelRendimientoColor = (nivel: string | undefined) => {
    switch (nivel?.toLowerCase()) {
      case 'alto':
        return 'bg-green-100 text-green-800';
      case 'medio':
        return 'bg-yellow-100 text-yellow-800';
      case 'bajo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNivelRendimientoIcon = (nivel: string | undefined) => {
    switch (nivel?.toLowerCase()) {
      case 'alto':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'medio':
        return <Info className="h-4 w-4 text-yellow-600" />;
      case 'bajo':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getEstudianteNombre = (id: number) => {
    const estudiante = estudiantes.find(e => e.id === id);
    return estudiante ? `${estudiante.first_name} ${estudiante.last_name}` : 'Estudiante no encontrado';
  };

  const getMateriaNombre = (id: number | null) => {
    const materia = materias.find(m => m.id === id);
    return materia ? materia.nombre : 'Materia no encontrada';
  };

  const handleOpenCreateDialog = (estudiante?: User) => {
    if (estudiante) {
      setSelectedEstudiante(estudiante.id);
    }
    setIsDialogOpen(true);
  };

  const handleOpenDetailsDialog = async (prediccion: Prediccion) => {
    setCurrentPrediccion(prediccion);
    setIsDetailsDialogOpen(true);

    try {
      // Obtener las recomendaciones específicas desde el endpoint
      const recomendacionesData = await api.fetchRecomendacionesPorPrediccion(prediccion.id);
      setRecomendaciones(recomendacionesData);
    } catch (error) {
      console.error("Error al cargar recomendaciones:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las recomendaciones para esta predicción",
      });
      setRecomendaciones([]);
    }
  };

  const handleGenerarPrediccion = async () => {
    if (!selectedMateria || !selectedEstudiante) return;

    await createPrediccionMutation.mutate({
      estudiante: selectedEstudiante,
      materia: selectedMateria
    });
  };

  return (
    <div>
      {/* Other components and logic */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la Predicción</DialogTitle>
            <DialogDescription>
              Información detallada sobre la predicción seleccionada.
            </DialogDescription>
          </DialogHeader>
          {currentPrediccion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Estudiante</h4>
                <p>{getEstudianteNombre(currentPrediccion.estudiante)}</p>
              </div>
              <div>
                <h4 className="font-medium">Materia</h4>
                <p>{getMateriaNombre(currentPrediccion.materia)}</p>
              </div>
              <div>
                <h4 className="font-medium">Nivel de Rendimiento</h4>
                <div className={`inline-flex items-center px-2 py-1 rounded-md ${getNivelRendimientoColor(currentPrediccion.nivel_rendimiento)}`}>
                  {getNivelRendimientoIcon(currentPrediccion.nivel_rendimiento)}
                  <span className="ml-2">{currentPrediccion.nivel_rendimiento}</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium">Confianza</h4>
                <Progress value={currentPrediccion.confianza} />
                <p>{currentPrediccion.confianza}%</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Recomendaciones</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  {recomendaciones && recomendaciones.length > 0 ? (
                    <ul className="text-sm space-y-2 list-disc pl-5">
                      {recomendaciones.map((recomendacion, index) => (
                        <li key={index}>{recomendacion}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Cargando recomendaciones...</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrediccionRendimiento;

