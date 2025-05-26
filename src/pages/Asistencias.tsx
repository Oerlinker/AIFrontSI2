import React, { useState, useEffect, useMemo } from 'react';
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
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Materia, Asistencia, Curso } from '@/types/academic';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import { CalendarCheck, Save, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Interfaz para la respuesta de estudiantes
interface Estudiante extends User {
  curso?: number;
}

const Asistencias: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedCurso, setSelectedCurso] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [asistencias, setAsistencias] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Verificar si el usuario es administrador o profesor
  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';
  const hasAccess = isAdmin || isProfesor;

  // Consulta para obtener materias del profesor si es profesor
  // o todas las materias si es administrador
  const {
    data: materias = [],
    isLoading: isLoadingMaterias
  } = useQuery({
    queryKey: ['materias-profesor'],
    queryFn: async () => {
      if (isProfesor && user?.id) {
        // Filtrar materias por profesor
        const allMaterias = await api.fetchMaterias();
        return allMaterias.filter((materia: Materia) => materia.profesor === user.id);
      } else {
        // Devolver todas las materias para administrador
        return api.fetchMaterias();
      }
    },
    enabled: hasAccess
  });

  // Nueva consulta para obtener cursos
  const {
    data: cursos = [],
    isLoading: isLoadingCursos
  } = useQuery<Curso[]>({
    queryKey: ['cursos'],
    queryFn: api.fetchCursos,
    enabled: hasAccess,
  });

  // Calcular cursos disponibles basados en la materia seleccionada
  const cursosDisponibles = useMemo(() => {
    if (!selectedMateria || !cursos.length) return [];
    return cursos.filter((curso) => curso.materias?.includes(selectedMateria));
  }, [selectedMateria, cursos]);

  // Consulta para obtener estudiantes filtrados por curso
  const {
    data: estudiantes = [],
    isLoading: isLoadingEstudiantes
  } = useQuery<Estudiante[]>({
    queryKey: ['estudiantes', selectedCurso],
    queryFn: async () => {
      if (!selectedCurso) return [];
      return api.fetchEstudiantes({ curso: selectedCurso });
    },
    enabled: hasAccess && !!selectedCurso,
  });

  // Consulta para obtener asistencias según la materia y fecha seleccionadas
  const {
    data: asistenciasData = [],
    isLoading: isLoadingAsistencias,
    refetch: refetchAsistencias
  } = useQuery({
    queryKey: ['asistencias', selectedMateria, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!selectedMateria || !selectedDate) return [];

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await api.fetchAsistencias({
        materia: selectedMateria,
        fecha: formattedDate
      });

      return response;
    },
    enabled: hasAccess && !!selectedMateria && !!selectedDate
  });

  // Mutación para registrar asistencias
  const registrarAsistenciasMutation = useMutation({
    mutationFn: async (asistenciasArray: Partial<Asistencia>[]) => {
      const promises = asistenciasArray.map(asistenciaData => {
        const existingAsistencia = asistenciasData.find(
          (a: Asistencia) => a.estudiante === asistenciaData.estudiante &&
                            a.materia === asistenciaData.materia &&
                            a.fecha === asistenciaData.fecha
        );

        if (existingAsistencia) {
          return api.updateAsistencia(existingAsistencia.id, asistenciaData);
        } else {
          return api.recordAsistencia(asistenciaData as Asistencia);
        }
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['asistencias', selectedMateria, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null]
      });
      toast({
        title: "Asistencias registradas",
        description: "Las asistencias han sido guardadas exitosamente",
      });
      setSaving(false);
    },
    onError: (error) => {
      console.error("Error al registrar asistencias:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar las asistencias. Por favor, intente nuevamente.",
      });
      setSaving(false);
    }
  });

  // Inicializar estado de asistencias cuando cambian los datos
  useEffect(() => {
    if (!hasAccess) return;

    const shouldUpdateState = (newAsistencias: Record<number, boolean>) => {
      if (Object.keys(asistencias).length === 0) return true;
      if (Object.keys(asistencias).length !== Object.keys(newAsistencias).length) return true;

      for (const id in newAsistencias) {
        if (asistencias[parseInt(id)] !== newAsistencias[parseInt(id)]) {
          return true;
        }
      }

      return false;
    };

    if (asistenciasData.length > 0) {
      const asistenciasMap: Record<number, boolean> = {};
      asistenciasData.forEach((asistencia: Asistencia) => {
        asistenciasMap[asistencia.estudiante] = asistencia.presente;
      });

      if (shouldUpdateState(asistenciasMap)) {
        setAsistencias(asistenciasMap);
      }
    } else if (estudiantes.length > 0) {
      const asistenciasMap: Record<number, boolean> = {};
      estudiantes.forEach((est: Estudiante) => {
        asistenciasMap[est.id] = true;
      });

      if (shouldUpdateState(asistenciasMap)) {
        setAsistencias(asistenciasMap);
      }
    }
  }, [asistenciasData, estudiantes, hasAccess, asistencias]);

  // Efecto para manejar cambios en la selección de materia
  useEffect(() => {
    setSelectedCurso(null);
    setAsistencias({});
  }, [selectedMateria]);

  // Efecto para auto-seleccionar el primer curso disponible
  useEffect(() => {
    if (cursosDisponibles.length > 0) {
      if (!selectedCurso || !cursosDisponibles.find(c => c.id === selectedCurso)) {
        setSelectedCurso(cursosDisponibles[0].id);
      }
    } else {
      setSelectedCurso(null);
    }
  }, [cursosDisponibles]);

  // Manejador para cambiar estado de asistencia
  const handleToggleAsistencia = (estudianteId: number) => {
    setAsistencias(prev => ({
      ...prev,
      [estudianteId]: !prev[estudianteId]
    }));
  };

  // Manejador para guardar las asistencias
  const handleSaveAsistencias = async () => {
    if (!selectedMateria || !selectedDate || !selectedCurso) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una materia, un curso y una fecha",
      });
      return;
    }

    setSaving(true);

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const asistenciasArray = estudiantes.map((estudiante: Estudiante) => ({
      estudiante: estudiante.id,
      materia: selectedMateria,
      fecha: formattedDate,
      presente: asistencias[estudiante.id] ?? true
    }));

    registrarAsistenciasMutation.mutate(asistenciasArray);
  };

  // Verificar si está cargando
  const isLoading = isLoadingMaterias || isLoadingEstudiantes || isLoadingCursos;
  const isLoadingData = !!selectedMateria && !!selectedDate && !!selectedCurso && isLoadingAsistencias;

  if (isLoading && !isLoadingData) {
    return (
      <div className="flex justify-center items-center h-96 flex-col">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-gray-600">Cargando información...</p>
      </div>
    );
  }

  // Componente para mostrar durante cargas de datos específicos
  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-md">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin mb-2 text-academic-purple" />
        <p className="text-sm text-gray-600">Cargando asistencias...</p>
      </div>
    </div>
  );

  // Control de acceso - hacemos esto después de los hooks
  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Registro de Asistencias</h1>
        <CalendarCheck className="h-8 w-8 text-academic-green" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Materia, Curso y Fecha</CardTitle>
          <CardDescription>Selecciona la materia, el curso y la fecha para registrar asistencias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                disabled={!selectedMateria || cursosDisponibles.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!selectedMateria ? "Seleccione materia primero" : (cursosDisponibles.length === 0 ? "No hay cursos" : "Seleccionar Curso")} />
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

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMateria && selectedCurso && selectedDate ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Asistencias: {materias.find(m => m.id === selectedMateria)?.nombre} - {cursos.find(c => c.id === selectedCurso)?.nombre} - {format(selectedDate, 'PPP', { locale: es })}
            </CardTitle>
            <CardDescription>
              Registro de asistencias para la fecha seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border relative">
              {isLoadingData && <LoadingOverlay />}
              <Table>
                <TableCaption>
                  Lista de estudiantes para registrar asistencia
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Asistencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        No hay estudiantes registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    estudiantes.map((estudiante: Estudiante) => (
                      <TableRow key={estudiante.id}>
                        <TableCell className="font-medium">
                          {estudiante.first_name} {estudiante.last_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {asistencias[estudiante.id] ? (
                            <Badge className="bg-green-600">Presente</Badge>
                          ) : (
                            <Badge variant="destructive">Ausente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={asistencias[estudiante.id] ?? true}
                            onCheckedChange={() => handleToggleAsistencia(estudiante.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveAsistencias}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Asistencias
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Selecciona una materia, un curso y una fecha para registrar asistencias</p>
        </div>
      )}
    </div>
  );
};

export default Asistencias;
