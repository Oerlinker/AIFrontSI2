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
import { Materia, Asistencia } from '@/types/academic';
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

  // Consulta para obtener estudiantes
  const {
    data: estudiantes = [],
    isLoading: isLoadingEstudiantes
  } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: async () => {
      return api.fetchUsuarios({ role: 'ESTUDIANTE' });
    },
    enabled: hasAccess
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
      // Procesar cada asistencia (crear o actualizar)
      const promises = asistenciasArray.map(asistenciaData => {
        const existingAsistencia = asistenciasData.find(
          (a: Asistencia) => a.estudiante === asistenciaData.estudiante &&
                            a.materia === asistenciaData.materia &&
                            a.fecha === asistenciaData.fecha
        );

        if (existingAsistencia) {
          // Actualizar asistencia existente
          return api.updateAsistencia(existingAsistencia.id, asistenciaData);
        } else {
          // Crear nueva asistencia
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

    // Función para verificar si ya existe el estado de asistencias y si es igual al que se quiere establecer
    const shouldUpdateState = (newAsistencias: Record<number, boolean>) => {
      // Si no hay asistencias actuales (primer renderizado), actualizar
      if (Object.keys(asistencias).length === 0) return true;

      // Si el número de estudiantes ha cambiado, actualizar
      if (Object.keys(asistencias).length !== Object.keys(newAsistencias).length) return true;

      // Comparar cada valor para ver si hay cambios
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

      // Solo actualizar el estado si es realmente necesario
      if (shouldUpdateState(asistenciasMap)) {
        setAsistencias(asistenciasMap);
      }
    } else if (estudiantes.length > 0) {
      // Si no hay asistencias registradas, inicializar todas como presentes
      const asistenciasMap: Record<number, boolean> = {};
      estudiantes.forEach((est: Estudiante) => {
        asistenciasMap[est.id] = true;
      });

      // Solo actualizar el estado si es realmente necesario
      if (shouldUpdateState(asistenciasMap)) {
        setAsistencias(asistenciasMap);
      }
    }
  }, [asistenciasData, estudiantes, hasAccess, asistencias]);

  // Manejador para cambiar estado de asistencia
  const handleToggleAsistencia = (estudianteId: number) => {
    setAsistencias(prev => ({
      ...prev,
      [estudianteId]: !prev[estudianteId]
    }));
  };

  // Manejador para guardar las asistencias
  const handleSaveAsistencias = async () => {
    if (!selectedMateria || !selectedDate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar una materia y una fecha",
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
  const isLoading = isLoadingMaterias || isLoadingEstudiantes ||
                   (selectedMateria && selectedDate && isLoadingAsistencias);

  // Obtener el nombre de la materia
  const getMateriaNombre = (id: number) => {
    const materia = materias.find((m: Materia) => m.id === id);
    return materia ? materia.nombre : "Materia no encontrada";
  };

  // Control de acceso - hacemos esto después de los hooks
  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando información...</p>
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
          <CardTitle>Seleccionar Materia y Fecha</CardTitle>
          <CardDescription>Selecciona la materia y la fecha para registrar asistencias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {selectedMateria && selectedDate ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Asistencias: {getMateriaNombre(selectedMateria)} - {format(selectedDate, 'PPP', { locale: es })}
            </CardTitle>
            <CardDescription>
              Registro de asistencias para la fecha seleccionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
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
          <p>Selecciona una materia y una fecha para registrar asistencias</p>
        </div>
      )}
    </div>
  );
};

export default Asistencias;
