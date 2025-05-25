import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {Prediccion, Materia, Curso} from '@/types/academic';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import {
  BrainCircuit,
  Loader2,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info
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

const PrediccionRendimiento: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<number | null>(null);
  const [materiaCurso, setMateriaCurso] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [currentPrediccion, setCurrentPrediccion] = useState<Prediccion | null>(null);

  // Verificar si el usuario es administrador o profesor
  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';

  // Consulta para obtener materias del profesor si es profesor
  // o todas las materias si es administrador
  const {
    data: materias = [],
    isLoading: isLoadingMaterias
  } = useQuery({
    queryKey: ['materias-profesor'],
    queryFn: async () => {
      if (isProfesor) {
        // Filtrar materias por profesor
        const allMaterias = await api.fetchMaterias();
        return allMaterias.filter((materia: Materia) => materia.profesor === user?.id);
      } else {
        // Devolver todas las materias para administrador
        return api.fetchMaterias();
      }
    }
  });

  // Consulta para obtener estudiantes basados en el curso de la materia seleccionada
  const {
    data: estudiantes = [],
    isLoading: isLoadingEstudiantes,
    refetch: refetchEstudiantes
  } = useQuery({
    queryKey: ['estudiantes', materiaCurso],
    queryFn: async () => {
      const params: { role: string; curso?: number } = { role: 'ESTUDIANTE' };

      // Si hay un curso asociado a la materia, filtrar estudiantes por ese curso
      if (materiaCurso) {
        params.curso = materiaCurso;
      }

      const response = await api.fetchUsuarios(params);
      return response;
    },
    enabled: true // Siempre activado, pero filtrará por curso si está disponible
  });

  // Efecto para obtener el curso asociado a la materia seleccionada
  useEffect(() => {
    const actualizarCursoMateria = async () => {
      if (selectedMateria) {
        try {
          // Obtener la lista de cursos
          const cursosData = await api.fetchCursos();

          // Buscar el curso que contiene la materia seleccionada
          const cursoConMateria = cursosData.find(
            (curso: Curso) => curso.materias && curso.materias.includes(selectedMateria)
          );

          if (cursoConMateria) {
            console.log(`Materia ${selectedMateria} encontrada en curso ${cursoConMateria.id}`);
            setMateriaCurso(cursoConMateria.id);
          } else {
            console.log(`No se encontró curso para la materia ${selectedMateria}`);
            setMateriaCurso(null);
          }

          // Limpiar el estudiante seleccionado para evitar inconsistencias
          setSelectedEstudiante(null);
        } catch (error) {
          console.error("Error al obtener información del curso:", error);
          setMateriaCurso(null);
        }
      } else {
        setMateriaCurso(null);
      }
    };

    actualizarCursoMateria();
  }, [selectedMateria]);

  // Consulta para obtener predicciones existentes
  const {
    data: predicciones = [],
    isLoading: isLoadingPredicciones,
    refetch: refetchPredicciones
  } = useQuery({
    queryKey: ['predicciones', selectedMateria],
    queryFn: async () => {
      const filters: { materia?: number } = {};

      if (selectedMateria) {
        filters.materia = selectedMateria;
      }

      return api.fetchPredicciones(filters);
    },
    enabled: !!selectedMateria
  });

  // Mutación para crear una nueva predicción
  const createPrediccionMutation = useMutation({
    mutationFn: (data: PrediccionFormData) => {
      return api.createPrediccion(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predicciones', selectedMateria] });
      toast({
        title: "Predicción generada",
        description: "El modelo IA ha completado la predicción de rendimiento",
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error al generar predicción:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar la predicción. Por favor, intente nuevamente.",
      });
    }
  });

  // Control de acceso - hacemos esto después de los hooks
  if (!isAdmin && !isProfesor) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  // Manejador para abrir diálogo de nueva predicción
  const handleOpenCreateDialog = (estudiante?: User) => {
    if (estudiante) {
      setSelectedEstudiante(estudiante.id);
    }
    setIsDialogOpen(true);
  };

  // Manejador para abrir diálogo de detalles
  const handleOpenDetailsDialog = (prediccion: Prediccion) => {
    setCurrentPrediccion(prediccion);
    setIsDetailsDialogOpen(true);
  };

  // Manejador para generar predicción
  const handleGenerarPrediccion = () => {
    if (!selectedMateria || !selectedEstudiante) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una materia y un estudiante",
      });
      return;
    }

    createPrediccionMutation.mutate({
      estudiante: selectedEstudiante,
      materia: selectedMateria
    });
  };

  // Obtener el nombre del estudiante
  const getEstudianteNombre = (id: number) => {
    const estudiante = estudiantes.find((e: User) => e.id === id);
    if (estudiante) {
      return `${estudiante.first_name} ${estudiante.last_name}`;
    }
    return "Estudiante no encontrado";
  };

  // Obtener el nombre de la materia
  const getMateriaNombre = (id: number) => {
    const materia = materias.find((m: Materia) => m.id === id);
    return materia ? materia.nombre : "Materia no encontrada";
  };

  // Obtener color según nivel de rendimiento
  const getNivelRendimientoColor = (nivel: string) => {
    switch (nivel) {
      case 'ALTO':
        return 'bg-green-600';
      case 'MEDIO':
        return 'bg-yellow-500';
      case 'BAJO':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  // Obtener icono según nivel de rendimiento
  const getNivelRendimientoIcon = (nivel: string) => {
    switch (nivel) {
      case 'ALTO':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'MEDIO':
        return <Info className="h-5 w-5 text-yellow-600" />;
      case 'BAJO':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  // Verificar si está cargando
  const isLoading = isLoadingMaterias || isLoadingEstudiantes ||
                    (!!selectedMateria && isLoadingPredicciones);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando información...</p>
      </div>
    );
  }

  // Filtrar estudiantes que ya tienen predicciones
  const estudiantesConPrediccion = predicciones.map((p: Prediccion) => p.estudiante);
  const estudiantesSinPrediccion = estudiantes.filter((e: User) =>
    !estudiantesConPrediccion.includes(e.id)
  );

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

            <div className="space-y-2 flex items-end">
              <Button
                onClick={() => handleOpenCreateDialog()}
                disabled={!selectedMateria || estudiantesSinPrediccion.length === 0}
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
        <Tabs defaultValue="predicciones" className="w-full">
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
                      <Progress value={80} className="w-[100px] mr-2" />
                      <span className="text-sm">80%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm font-medium text-gray-700">Participación</p>
                    <div className="flex items-center mt-1">
                      <Progress value={65} className="w-[100px] mr-2" />
                      <span className="text-sm">65%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm font-medium text-gray-700">Notas</p>
                    <div className="flex items-center mt-1">
                      <Progress value={75} className="w-[100px] mr-2" />
                      <span className="text-sm">75/100</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-gray-50 border">
                    <p className="text-sm font-medium text-gray-700">Interacción</p>
                    <div className="flex items-center mt-1">
                      <Progress value={60} className="w-[100px] mr-2" />
                      <span className="text-sm">60%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Recomendaciones</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <ul className="text-sm space-y-2 list-disc pl-5">
                    <li>Mejorar la frecuencia de participación en clase</li>
                    <li>Implementar sesiones adicionales para reforzar conceptos clave</li>
                    <li>Proporcionar feedback más detallado en las evaluaciones</li>
                    <li>Sugerir material de estudio complementario</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                <span>Fecha de predicción: {new Date(currentPrediccion.fecha_prediccion).toLocaleString()}</span>
                <span>ID: {currentPrediccion.id}</span>
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
