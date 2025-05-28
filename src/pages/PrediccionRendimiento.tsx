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
  BrainCircuit, Loader2, ArrowUpRight, TrendingUp, AlertTriangle, CheckCircle, Info, BarChart3, ClipboardCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import ComparativaRendimiento from '@/components/prediccion/ComparativaRendimiento';

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
  const [recomendacionesExpanded, setRecomendacionesExpanded] = useState(false);
  const [filtroEstudiante, setFiltroEstudiante] = useState<number | null>(null);
  const [filtroMateria, setFiltroMateria] = useState<number | null>(null);
  const [tabActiva, setTabActiva] = useState<string>("predicciones");
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);

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

  // Hook para obtener los datos de comparativa de rendimiento
  const { data: comparativoRendimiento, isFetching: isFetchingComparativo } = useQuery({
    queryKey: ['comparativo-rendimiento', filtroEstudiante, filtroMateria],
    queryFn: async () => {
      // Construir objeto de filtros solo con los valores que no son nulos
      const filtros: { estudiante?: number; materia?: number } = {};
      if (filtroEstudiante) filtros.estudiante = filtroEstudiante;
      if (filtroMateria) filtros.materia = filtroMateria;

      return await api.fetchComparativoRendimiento(filtros);
    },
    enabled: isAdmin || isProfesor, // Solo se ejecuta si el usuario es administrador o profesor
  });

  // Hook para obtener los períodos disponibles
  const { data: periodos = [], isFetching: isFetchingPeriodos } = useQuery({
    queryKey: ['periodos'],
    queryFn: api.fetchPeriodos,
    enabled: isAdmin, // Solo para administradores
  });

  // Hook para obtener estadísticas de materia
  const { data: estadisticasMateria, isFetching: isFetchingEstadisticas } = useQuery({
    queryKey: ['estadisticas-materia', selectedMateria, selectedPeriodo],
    queryFn: async () => {
      if (!selectedMateria) return null;
      return api.fetchEstadisticasMateria(selectedMateria, selectedPeriodo || undefined);
    },
    enabled: !!(isAdmin && selectedMateria),
  });

  // Hook para obtener reporte trimestral
  const { data: reporteTrimestral, isFetching: isFetchingReporte } = useQuery({
    queryKey: ['reporte-trimestral', selectedCurso, selectedPeriodo],
    queryFn: async () => {
      if (!selectedCurso || !selectedPeriodo) return null;
      return api.fetchReporteTrimestral(selectedCurso, selectedPeriodo);
    },
    enabled: !!(isAdmin && selectedCurso && selectedPeriodo),
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
    // Inicialmente establecemos recomendaciones como un array vacío
    setRecomendaciones([]);

    try {
      // Obtener las recomendaciones específicas desde el endpoint
      const response = await api.fetchRecomendacionesPorPrediccion(prediccion.id);

      // El formato esperado es un objeto con una propiedad "recomendaciones" que contiene un array de objetos
      // con propiedades "categoria" y "mensaje"
      if (response && typeof response === 'object' && 'recomendaciones' in response) {
        if (Array.isArray(response.recomendaciones)) {
          // Transformar cada objeto de recomendación en un string con formato: "[Categoría] Mensaje"
          const formattedRecomendaciones = response.recomendaciones.map(rec => {
            if (typeof rec === 'object' && rec !== null && 'categoria' in rec && 'mensaje' in rec) {
              return `[${rec.categoria}] ${rec.mensaje}`;
            }
            // Si la recomendación no tiene el formato esperado, devolver el objeto como string
            return JSON.stringify(rec);
          });
          setRecomendaciones(formattedRecomendaciones);
        } else {
          setRecomendaciones(['El formato de las recomendaciones no es el esperado']);
        }
      } else {
        setRecomendaciones(['No se encontraron recomendaciones para este estudiante']);
      }
    } catch (error) {
      console.error("Error al cargar recomendaciones:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al procesar las recomendaciones recibidas",
      });
      setRecomendaciones(['Error al cargar las recomendaciones. Por favor, intente nuevamente.']);
    }
  };

  const handleGenerarPrediccion = async () => {
    if (!selectedMateria || !selectedEstudiante) return;

    await createPrediccionMutation.mutate({
      estudiante: selectedEstudiante,
      materia: selectedMateria
    });
  };

  // Función para ver comparativa específica desde los detalles de una predicción
  const handleVerComparativaEspecifica = (estudiante: number, materia: number) => {
    setFiltroEstudiante(estudiante);
    setFiltroMateria(materia);
    setIsDetailsDialogOpen(false); // Cerramos el diálogo de detalles
    setTabActiva("comparativa"); // Cambiamos a la pestaña de comparativa

    // Notificar que se está cargando la comparativa específica
    toast({
      title: "Cargando comparativa",
      description: "Consultando datos de comparativa para este estudiante y materia."
    });
  };

  if (!isAdmin && !isProfesor) {
    return <div className="flex justify-center items-center h-96"><h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1></div>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2">Cargando...</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Predicción de Rendimiento Académico</h1>
          <p className="text-muted-foreground">
            Análisis predictivo del rendimiento estudiantil basado en inteligencia artificial
          </p>
        </div>
        <BrainCircuit className="h-12 w-12 text-academic-purple" />
      </div>

      <Tabs
        defaultValue="predicciones"
        value={tabActiva}
        onValueChange={(value) => setTabActiva(value)}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="predicciones">Predicciones</TabsTrigger>
          <TabsTrigger value="comparativa">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-1" />
              Comparativa Rendimiento
            </div>
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="estadisticas">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Estadísticas Materia
                </div>
              </TabsTrigger>
              <TabsTrigger value="reportes">
                <div className="flex items-center">
                  <ClipboardCheck className="h-4 w-4 mr-1" />
                  Reportes Trimestrales
                </div>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="predicciones">
          <Card>
            <CardHeader>
              <CardTitle>Generar Predicciones</CardTitle>
              <CardDescription>Selecciona una materia para analizar y predecir el rendimiento académico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="materia">Materia</Label>
                  <Select
                    onValueChange={(value) => setSelectedMateria(parseInt(value))}
                    value={selectedMateria?.toString() || ""}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar Materia" />
                    </SelectTrigger>
                    <SelectContent>
                      {materias.map((materia: Materia) => (
                        <SelectItem key={materia.id} value={materia.id.toString()}>
                          {materia.nombre} ({materia.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="curso">Curso</Label>
                  <Select
                    onValueChange={(value) => setSelectedCurso(parseInt(value))}
                    value={selectedCurso?.toString() || ""}
                    disabled={!selectedMateria}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedMateria ? "Seleccionar Curso" : "Primero seleccione una materia"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cursosDisponibles.map((curso: Curso) => (
                        <SelectItem key={curso.id} value={curso.id.toString()}>
                          {curso.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex items-end">
                  <Button
                    onClick={() => handleOpenCreateDialog()}
                    disabled={!selectedMateria || !selectedCurso || estudiantesSinPrediccion.length === 0}
                    className="w-full"
                  >
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Generar Nueva Predicción
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedMateria && (
            <Tabs defaultValue="predicciones" className="w-full mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="predicciones">Predicciones Existentes</TabsTrigger>
                <TabsTrigger value="pendientes">Estudiantes Sin Análisis</TabsTrigger>
              </TabsList>

              <TabsContent value="predicciones">
                {predicciones.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Predicciones para {getMateriaNombre(selectedMateria)}
                      </CardTitle>
                      <CardDescription>
                        Resultados del análisis predictivo para los estudiantes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableCaption>
                            Total de predicciones: {predicciones.length}
                          </TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Estudiante</TableHead>
                              <TableHead>Nivel Predicho</TableHead>
                              <TableHead>Confianza</TableHead>
                              <TableHead>Fecha Predicción</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {predicciones.map((prediccion: Prediccion) => (
                              <TableRow key={prediccion.id}>
                                <TableCell className="font-medium">
                                  {getEstudianteNombre(prediccion.estudiante)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {getNivelRendimientoIcon(prediccion.nivel_rendimiento)}
                                    <Badge className={`${getNivelRendimientoColor(prediccion.nivel_rendimiento)}`}>
                                      {prediccion.nivel_rendimiento}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={prediccion.confianza} className="w-[60px]" />
                                    <span>{prediccion.confianza}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {new Date(prediccion.fecha_prediccion).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenDetailsDialog(prediccion)}
                                  >
                                    <ArrowUpRight className="h-3 w-3 mr-1" />
                                    Detalles
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-10 bg-white rounded-lg border shadow-sm">
                    <BrainCircuit className="h-16 w-16 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No hay predicciones generadas</h3>
                    <p className="text-gray-500 mt-2 mb-5">
                      No se han generado predicciones de rendimiento para esta materia.
                    </p>
                    <Button
                      onClick={() => handleOpenCreateDialog()}
                      disabled={estudiantesSinPrediccion.length === 0}
                    >
                      Generar primera predicción
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pendientes">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Estudiantes sin análisis predictivo
                    </CardTitle>
                    <CardDescription>
                      Estudiantes que aún no tienen una predicción de rendimiento para esta materia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {estudiantesSinPrediccion.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableCaption>
                            Total: {estudiantesSinPrediccion.length} estudiantes sin predicción
                          </TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {estudiantesSinPrediccion.map((estudiante: User) => (
                              <TableRow key={estudiante.id}>
                                <TableCell>{estudiante.id}</TableCell>
                                <TableCell className="font-medium">
                                  {estudiante.first_name} {estudiante.last_name}
                                </TableCell>
                                <TableCell>{estudiante.email}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenCreateDialog(estudiante)}
                                  >
                                    <BrainCircuit className="h-3 w-3 mr-1" />
                                    Generar Predicción
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-3" />
                        <h3 className="text-lg font-medium">¡Análisis completo!</h3>
                        <p className="text-gray-500 mt-2">
                          Todos los estudiantes ya tienen predicciones de rendimiento para esta materia.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="comparativa">
          <div className="mb-4">
            {filtroEstudiante && filtroMateria && (
              <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center p-4">
                  <div className="mb-2 md:mb-0">
                    <h3 className="text-sm font-semibold">
                      Mostrando comparativa específica para:
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getEstudianteNombre(filtroEstudiante)} - {getMateriaNombre(filtroMateria)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFiltroEstudiante(null);
                      setFiltroMateria(null);
                      toast({ title: "Comparativa actualizada", description: "Mostrando todas las comparativas disponibles" });
                    }}
                    className="text-sm bg-white hover:bg-blue-50"
                    size="sm"
                  >
                    <BarChart3 className="mr-1 h-4 w-4" />
                    Volver a comparativa general
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          <ComparativaRendimiento
            data={comparativoRendimiento}
            isLoading={isFetchingComparativo}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="estadisticas">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas por Materia</CardTitle>
                <CardDescription>Análisis detallado del rendimiento en la materia seleccionada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="materia-estadistica">Materia</Label>
                    <Select
                      onValueChange={(value) => setSelectedMateria(parseInt(value))}
                      value={selectedMateria?.toString() || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar Materia" />
                      </SelectTrigger>
                      <SelectContent>
                        {materias.map((materia: Materia) => (
                          <SelectItem key={materia.id} value={materia.id.toString()}>
                            {materia.nombre} ({materia.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodo-estadistica">Período</Label>
                    <Select
                      onValueChange={(value) => setSelectedPeriodo(parseInt(value))}
                      value={selectedPeriodo?.toString() || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar Período" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo: any) => (
                          <SelectItem key={periodo.id} value={periodo.id.toString()}>
                            {periodo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedMateria ? (
                  isFetchingEstadisticas ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <p>Cargando estadísticas...</p>
                    </div>
                  ) : estadisticasMateria ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Promedio General</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{estadisticasMateria.promedio_total}/100</div>
                            <Progress
                              value={estadisticasMateria.promedio_total}
                              className="h-2 mt-2"
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Tasa de Aprobación</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{estadisticasMateria.porcentaje_aprobacion}%</div>
                            <Progress
                              value={estadisticasMateria.porcentaje_aprobacion}
                              className="h-2 mt-2"
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Mejor Nota</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{estadisticasMateria.mejor_nota}/100</div>
                          </CardContent>
                        </Card>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-3">Distribución por Dimensiones</h3>
                        <div className="bg-gray-50 rounded-lg p-4 border">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {estadisticasMateria.promedios && (
                              <>
                                <div className="flex flex-col items-center">
                                  <div className="h-24 w-full flex items-end mb-1">
                                    <div
                                      className="bg-blue-500 w-full rounded-t-sm"
                                      style={{ height: `${estadisticasMateria.promedios.ser}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium">Ser</span>
                                  <span className="text-xs text-gray-500">{Math.round(estadisticasMateria.promedios.ser)}%</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="h-24 w-full flex items-end mb-1">
                                    <div
                                      className="bg-green-500 w-full rounded-t-sm"
                                      style={{ height: `${estadisticasMateria.promedios.saber}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium">Saber</span>
                                  <span className="text-xs text-gray-500">{Math.round(estadisticasMateria.promedios.saber)}%</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="h-24 w-full flex items-end mb-1">
                                    <div
                                      className="bg-yellow-500 w-full rounded-t-sm"
                                      style={{ height: `${estadisticasMateria.promedios.hacer}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium">Hacer</span>
                                  <span className="text-xs text-gray-500">{Math.round(estadisticasMateria.promedios.hacer)}%</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="h-24 w-full flex items-end mb-1">
                                    <div
                                      className="bg-purple-500 w-full rounded-t-sm"
                                      style={{ height: `${estadisticasMateria.promedios.decidir}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium">Decidir</span>
                                  <span className="text-xs text-gray-500">{Math.round(estadisticasMateria.promedios.decidir)}%</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="h-24 w-full flex items-end mb-1">
                                    <div
                                      className="bg-orange-500 w-full rounded-t-sm"
                                      style={{ height: `${estadisticasMateria.promedios.autoevaluacion_ser}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium">Auto Ser</span>
                                  <span className="text-xs text-gray-500">{Math.round(estadisticasMateria.promedios.autoevaluacion_ser)}%</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="h-24 w-full flex items-end mb-1">
                                    <div
                                      className="bg-red-500 w-full rounded-t-sm"
                                      style={{ height: `${estadisticasMateria.promedios.autoevaluacion_decidir}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium">Auto Dec.</span>
                                  <span className="text-xs text-gray-500">{Math.round(estadisticasMateria.promedios.autoevaluacion_decidir)}%</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-3">Estudiantes ({estadisticasMateria.total_estudiantes})</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Ser</TableHead>
                                <TableHead>Saber</TableHead>
                                <TableHead>Hacer</TableHead>
                                <TableHead>Decidir</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {estadisticasMateria.estudiantes?.map((estudiante) => (
                                <TableRow key={estudiante.estudiante_id}>
                                  <TableCell className="font-medium">{estudiante.nombre}</TableCell>
                                  <TableCell>{estudiante.ser}</TableCell>
                                  <TableCell>{estudiante.saber}</TableCell>
                                  <TableCell>{estudiante.hacer}</TableCell>
                                  <TableCell>{estudiante.decidir}</TableCell>
                                  <TableCell className="font-medium">{estudiante.nota_total}</TableCell>
                                  <TableCell>
                                    <Badge className={estudiante.aprobado ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                      {estudiante.aprobado ? "Aprobado" : "Reprobado"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                      <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900">No hay datos disponibles</h3>
                      <p className="text-gray-500 mt-2">
                        No se encontraron estadísticas para esta materia y período.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Selecciona una materia</h3>
                    <p className="text-gray-500 mt-2">
                      Por favor, selecciona una materia para ver sus estadísticas.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="reportes">
            <Card>
              <CardHeader>
                <CardTitle>Reporte Trimestral</CardTitle>
                <CardDescription>Análisis detallado del rendimiento por curso y período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="curso-reporte">Curso</Label>
                    <Select
                      onValueChange={(value) => setSelectedCurso(parseInt(value))}
                      value={selectedCurso?.toString() || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar Curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {cursos.map((curso: Curso) => (
                          <SelectItem key={curso.id} value={curso.id.toString()}>
                            {curso.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodo-reporte">Período</Label>
                    <Select
                      onValueChange={(value) => setSelectedPeriodo(parseInt(value))}
                      value={selectedPeriodo?.toString() || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar Período" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo: any) => (
                          <SelectItem key={periodo.id} value={periodo.id.toString()}>
                            {periodo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedCurso && selectedPeriodo ? (
                  isFetchingReporte ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <p>Generando reporte trimestral...</p>
                    </div>
                  ) : reporteTrimestral ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <h3 className="font-medium mb-2">Resumen General - {reporteTrimestral.periodo?.nombre}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-sm text-gray-500">Promedio General</p>
                            <p className="text-2xl font-bold">{reporteTrimestral.estadisticas_curso?.promedio_general}/100</p>
                          </div>
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-sm text-gray-500">Total Materias</p>
                            <p className="text-2xl font-bold">{reporteTrimestral.estadisticas_curso?.total_materias}</p>
                          </div>
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-sm text-gray-500">% Aprobación</p>
                            <p className="text-2xl font-bold">{reporteTrimestral.estadisticas_curso?.porcentaje_aprobacion}%</p>
                          </div>
                          <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-sm text-gray-500">Total Estudiantes</p>
                            <p className="text-2xl font-bold">{reporteTrimestral.total_estudiantes}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="font-medium mb-3">Estudiantes del Curso</h3>
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Promedio</TableHead>
                                <TableHead>Materias Aprobadas</TableHead>
                                <TableHead>Materias Reprobadas</TableHead>
                                <TableHead>Estado General</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reporteTrimestral.estudiantes?.map((estudiante) => (
                                <TableRow key={estudiante.estudiante_id}>
                                  <TableCell className="font-medium">{estudiante.nombre}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Progress value={estudiante.promedio_general} className="w-[60px] mr-2" />
                                      <span>{estudiante.promedio_general}/100</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{estudiante.aprobadas}</TableCell>
                                  <TableCell>{estudiante.reprobadas}</TableCell>
                                  <TableCell>
                                    {estudiante.reprobadas === 0 ? (
                                      <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
                                    ) : estudiante.reprobadas <= 2 ? (
                                      <Badge className="bg-yellow-100 text-yellow-800">Condicional</Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-800">Reprobado</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button variant="outline" className="mr-2">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Exportar PDF
                        </Button>
                        <Button>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Enviar Reporte
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                      <ClipboardCheck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900">No hay datos disponibles</h3>
                      <p className="text-gray-500 mt-2">
                        No se encontró un reporte para este curso y período.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Selecciona un curso y período</h3>
                    <p className="text-gray-500 mt-2">
                      Por favor, selecciona un curso y período para generar el reporte trimestral.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      {/* Diálogo para generar predicción */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Generar Predicción de Rendimiento
            </DialogTitle>
            <DialogDescription>
              El sistema utilizará inteligencia artificial para predecir el rendimiento académico
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Análisis predictivo de rendimiento</AlertTitle>
              <AlertDescription>
                El modelo utilizará datos históricos de notas, asistencias y participaciones
                para generar una predicción de rendimiento académico.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="materia">Materia</Label>
              <Select
                value={selectedMateria?.toString() || ""}
                onValueChange={(value) => setSelectedMateria(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {materias.map((materia: Materia) => (
                    <SelectItem key={materia.id} value={materia.id.toString()}>
                      {materia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMateria && selectedCurso && (
              <div className="space-y-2">
                <Label htmlFor="estudiante">Estudiante</Label>
                <Select
                  value={selectedEstudiante?.toString() || ""}
                  onValueChange={(value) => setSelectedEstudiante(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {estudiantesSinPrediccion.map((estudiante: User) => (
                      <SelectItem key={estudiante.id} value={estudiante.id.toString()}>
                        {estudiante.first_name} {estudiante.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerarPrediccion}
              disabled={!selectedMateria || !selectedEstudiante || createPrediccionMutation.isPending}
            >
              {createPrediccionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  Generar Predicción
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar detalles de predicción */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Detalles de Predicción
            </DialogTitle>
            <DialogDescription>
              Análisis completo de la predicción de rendimiento académico
            </DialogDescription>
          </DialogHeader>

          {currentPrediccion && (
            <div className="grid gap-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{getEstudianteNombre(currentPrediccion.estudiante)}</h3>
                  <p className="text-sm text-muted-foreground">{getMateriaNombre(currentPrediccion.materia)}</p>
                </div>
                <Badge className={`${getNivelRendimientoColor(currentPrediccion.nivel_rendimiento)} text-lg py-1 px-3`}>
                  {currentPrediccion.nivel_rendimiento}
                </Badge>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Confianza de la predicción</h4>
                <div className="flex items-center space-x-3">
                  <Progress value={currentPrediccion.confianza} className="w-[200px]" />
                  <span className="font-bold">{currentPrediccion.confianza}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Factores de influencia</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm font-medium text-gray-700">Asistencia</p>
                    <div className="flex items-center mt-1">
                      <Progress value={currentPrediccion.porcentaje_asistencia} className="w-[100px] mr-2" />
                      <span className="text-sm">{currentPrediccion.porcentaje_asistencia}%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm font-medium text-gray-700">Participación</p>
                    <div className="flex items-center mt-1">
                      <Progress value={currentPrediccion.promedio_participaciones} className="w-[100px] mr-2" />
                      <span className="text-sm">{currentPrediccion.promedio_participaciones}%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm font-medium text-gray-700">Notas</p>
                    <div className="flex items-center mt-1">
                      <Progress value={currentPrediccion.promedio_notas} className="w-[100px] mr-2" />
                      <span className="text-sm">{currentPrediccion.promedio_notas}/100</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm font-medium text-gray-700">Interacción</p>
                    <div className="flex items-center mt-1">
                      <Progress value={currentPrediccion.valor_numerico} className="w-[100px] mr-2" />
                      <span className="text-sm">{currentPrediccion.valor_numerico}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Recomendaciones</h4>
                {recomendaciones && recomendaciones.length > 0 ? (
                  <div className="relative">
                    <div
                      className="bg-blue-50 border border-blue-200 rounded-md p-3 overflow-y-auto"
                      style={{ maxHeight: recomendacionesExpanded ? '400px' : '200px' }}
                    >
                      <div className="text-xs text-gray-500 italic mb-2 text-right">
                        {recomendaciones.length} recomendaciones
                      </div>
                      <ul className="text-sm space-y-2 list-disc pl-5">
                        {recomendaciones.map((recomendacion, index) => (
                          <li key={index}>{recomendacion}</li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRecomendacionesExpanded(!recomendacionesExpanded)}
                      className="absolute bottom-2 right-2 bg-white/80 hover:bg-white shadow-sm"
                    >
                      {recomendacionesExpanded ? 'Ver menos' : 'Ver más'}
                    </Button>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 h-[100px] flex items-center justify-center">
                    <p className="text-sm text-gray-500 italic">Cargando recomendaciones...</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                <span>Fecha de predicción: {new Date(currentPrediccion.fecha_prediccion).toLocaleString()}</span>
                <span>ID: {currentPrediccion.id}</span>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => handleVerComparativaEspecifica(currentPrediccion.estudiante, currentPrediccion.materia)}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Comparativa Específica
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrediccionRendimiento;

