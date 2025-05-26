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
  nivel_rendimiento?: string;
  confianza: number;
  fecha_prediccion: string;
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

  const handleOpenDetailsDialog = (prediccion: Prediccion) => {
    setCurrentPrediccion(prediccion);
    setIsDetailsDialogOpen(true);
  };

  const handleGenerarPrediccion = async () => {
    if (!selectedMateria || !selectedEstudiante) return;

    await createPrediccionMutation.mutate({
      estudiante: selectedEstudiante,
      materia: selectedMateria
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

