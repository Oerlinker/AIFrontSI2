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
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Nota, Periodo, Materia } from '@/types/academic';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import { Pencil, Save, Loader2, BookOpen } from 'lucide-react';

interface NotaFormData {
  estudiante: number;
  materia: number;
  periodo: number;
  ser_puntaje: number;
  decidir_puntaje: number;
  hacer_puntaje: number;
  saber_puntaje: number;
  autoevaluacion_ser: number;
  autoevaluacion_decidir: number;
  comentario?: string;
}

const Notas: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMateria, setSelectedMateria] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentNota, setCurrentNota] = useState<Nota | null>(null);
  const [formData, setFormData] = useState<NotaFormData>({
    estudiante: 0,
    materia: 0,
    periodo: 0,
    ser_puntaje: 0,
    decidir_puntaje: 0,
    hacer_puntaje: 0,
    saber_puntaje: 0,
    autoevaluacion_ser: 0,
    autoevaluacion_decidir: 0,
    comentario: ''
  });

  // Verificar si el usuario es administrador o profesor
  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';

  // Consulta para obtener periodos
  const {
    data: periodos = [],
    isLoading: isLoadingPeriodos
  } = useQuery({
    queryKey: ['periodos'],
    queryFn: api.fetchPeriodos
  });

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

  // Consulta para obtener estudiantes
  const {
    data: estudiantes = [],
    isLoading: isLoadingEstudiantes
  } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: async () => {
      const response = await api.fetchUsuarios({ rol: 'ESTUDIANTE' });
      return response;
    }
  });

  // Consulta para obtener notas según el periodo y materia seleccionados
  const {
    data: notas = [],
    isLoading: isLoadingNotas,
    refetch: refetchNotas
  } = useQuery({
    queryKey: ['notas', selectedMateria, selectedPeriodo],
    queryFn: () => {
      if (!selectedMateria || !selectedPeriodo) return [];
      return api.fetchNotas({
        materia: selectedMateria,
        periodo: selectedPeriodo
      });
    },
    enabled: !!selectedMateria && !!selectedPeriodo
  });

  // Mutación para crear una nueva nota
  const createNotaMutation = useMutation({
    mutationFn: (data: NotaFormData) => api.createNota(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas', selectedMateria, selectedPeriodo] });
      toast({
        title: "Calificación registrada",
        description: "La calificación ha sido registrada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error al registrar calificación:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la calificación. Por favor, intente nuevamente.",
      });
    }
  });

  // Mutación para actualizar una nota
  const updateNotaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NotaFormData> }) => api.updateNota(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas', selectedMateria, selectedPeriodo] });
      toast({
        title: "Calificación actualizada",
        description: "La calificación ha sido actualizada exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Error al actualizar calificación:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la calificación. Por favor, intente nuevamente.",
      });
    }
  });

  // Actualizar formData cuando cambian las selecciones
  useEffect(() => {
    if (selectedMateria && selectedPeriodo) {
      setFormData(prev => ({
        ...prev,
        materia: selectedMateria,
        periodo: selectedPeriodo
      }));
    }
  }, [selectedMateria, selectedPeriodo]);

  // Control de acceso - hacemos esto después de los hooks
  if (!isAdmin && !isProfesor) {
    return (
      <div className="flex justify-center items-center h-96">
        <h1 className="text-xl text-red-500">No tienes permisos para acceder a esta página</h1>
      </div>
    );
  }

  // Manejador para abrir el diálogo de creación/edición
  const handleOpenDialog = (estudiante: User, notaExistente?: Nota) => {
    if (notaExistente) {
      // Editar nota existente
      setCurrentNota(notaExistente);
      setFormData({
        estudiante: notaExistente.estudiante,
        materia: notaExistente.materia,
        periodo: notaExistente.periodo,
        ser_puntaje: notaExistente.ser_puntaje,
        decidir_puntaje: notaExistente.decidir_puntaje,
        hacer_puntaje: notaExistente.hacer_puntaje,
        saber_puntaje: notaExistente.saber_puntaje,
        autoevaluacion_ser: notaExistente.autoevaluacion_ser,
        autoevaluacion_decidir: notaExistente.autoevaluacion_decidir,
        comentario: notaExistente.comentario || ''
      });
    } else {
      // Crear nueva nota
      setCurrentNota(null);
      setFormData({
        estudiante: estudiante.id,
        materia: selectedMateria || 0,
        periodo: selectedPeriodo || 0,
        ser_puntaje: 0,
        decidir_puntaje: 0,
        hacer_puntaje: 0,
        saber_puntaje: 0,
        autoevaluacion_ser: 0,
        autoevaluacion_decidir: 0,
        comentario: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentNota(null);
  };

  // Manejador para cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Para campos numéricos, asegurar que estén entre 0 y 100
    if (['ser_puntaje', 'decidir_puntaje', 'hacer_puntaje', 'saber_puntaje', 'autoevaluacion_ser', 'autoevaluacion_decidir'].includes(name)) {
      let numValue = parseFloat(value);
      if (isNaN(numValue)) numValue = 0;
      if (numValue < 0) numValue = 0;
      if (numValue > 100) numValue = 100;

      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Manejador para enviar el formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentNota) {
      // Actualizar nota existente
      updateNotaMutation.mutate({
        id: currentNota.id,
        data: formData
      });
    } else {
      // Crear nueva nota
      createNotaMutation.mutate(formData);
    }
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

  // Obtener el nombre del periodo
  const getPeriodoNombre = (id: number) => {
    const periodo = periodos.find((p: Periodo) => p.id === id);
    return periodo ? `${periodo.trimestre_display} - ${periodo.año_academico}` : "Periodo no encontrado";
  };

  // Encontrar nota existente para un estudiante
  const findNotaForEstudiante = (estudianteId: number) => {
    return notas.find((nota: Nota) => nota.estudiante === estudianteId);
  };

  // Verificar si está cargando
  const isLoading = isLoadingPeriodos || isLoadingMaterias || isLoadingEstudiantes ||
                    (selectedMateria && selectedPeriodo && isLoadingNotas);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Cargando información...</p>
      </div>
    );
  }

  // Renderizado del componente
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Registro de Notas</h1>
        <BookOpen className="h-8 w-8 text-academic-blue" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Materia y Periodo</CardTitle>
          <CardDescription>Selecciona la materia y el periodo para registrar o consultar notas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="materia">Materia</Label>
              <Select
                onValueChange={(value) => setSelectedMateria(parseInt(value))}
                value={selectedMateria?.toString() || ""}
              >
                <SelectTrigger>
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
              <Label htmlFor="periodo">Periodo</Label>
              <Select
                onValueChange={(value) => setSelectedPeriodo(parseInt(value))}
                value={selectedPeriodo?.toString() || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((periodo: Periodo) => (
                    <SelectItem key={periodo.id} value={periodo.id.toString()}>
                      {periodo.trimestre_display} - {periodo.año_academico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMateria && selectedPeriodo ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Calificaciones: {getMateriaNombre(selectedMateria)} - {getPeriodoNombre(selectedPeriodo)}
            </CardTitle>
            <CardDescription>
              Registro de calificaciones para el periodo seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableCaption>
                  Lista de estudiantes y sus calificaciones para {getMateriaNombre(selectedMateria)}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead className="text-center">Saber Ser</TableHead>
                    <TableHead className="text-center">Saber Decidir</TableHead>
                    <TableHead className="text-center">Saber Hacer</TableHead>
                    <TableHead className="text-center">Saber Conocer</TableHead>
                    <TableHead className="text-center">Nota Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estudiantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No hay estudiantes registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    estudiantes.map((estudiante: User) => {
                      const notaExistente = findNotaForEstudiante(estudiante.id);
                      const notaTotal = notaExistente ?
                        (notaExistente.ser_total + notaExistente.decidir_total + notaExistente.nota_total) / 3 :
                        null;

                      return (
                        <TableRow key={estudiante.id}>
                          <TableCell className="font-medium">
                            {estudiante.first_name} {estudiante.last_name}
                          </TableCell>
                          <TableCell className="text-center">
                            {notaExistente ? notaExistente.ser_puntaje : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {notaExistente ? notaExistente.decidir_puntaje : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {notaExistente ? notaExistente.hacer_puntaje : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {notaExistente ? notaExistente.saber_puntaje : "-"}
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {notaTotal ? notaTotal.toFixed(1) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={notaExistente ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleOpenDialog(estudiante, notaExistente)}
                            >
                              {notaExistente ? (
                                <>
                                  <Pencil className="h-3 w-3 mr-1" /> Editar
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3 mr-1" /> Registrar
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Selecciona una materia y un periodo para ver y registrar calificaciones</p>
        </div>
      )}

      {/* Diálogo para crear/editar nota */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {currentNota ? "Editar Calificación" : "Registrar Calificación"}
            </DialogTitle>
            <DialogDescription>
              {currentNota
                ? `Actualizar calificación de ${getEstudianteNombre(formData.estudiante)}`
                : `Registrar calificación para ${getEstudianteNombre(formData.estudiante)}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label>Estudiante:</Label>
                <p className="font-medium">{getEstudianteNombre(formData.estudiante)}</p>
              </div>

              <div className="space-y-1">
                <Label>Materia:</Label>
                <p className="font-medium">{getMateriaNombre(formData.materia)}</p>
              </div>

              <div className="space-y-1">
                <Label>Periodo:</Label>
                <p className="font-medium">{getPeriodoNombre(formData.periodo)}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ser_puntaje">
                    Saber Ser (0-100)
                  </Label>
                  <Input
                    id="ser_puntaje"
                    name="ser_puntaje"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.ser_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="decidir_puntaje">
                    Saber Decidir (0-100)
                  </Label>
                  <Input
                    id="decidir_puntaje"
                    name="decidir_puntaje"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.decidir_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hacer_puntaje">
                    Saber Hacer (0-100)
                  </Label>
                  <Input
                    id="hacer_puntaje"
                    name="hacer_puntaje"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.hacer_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saber_puntaje">
                    Saber Conocer (0-100)
                  </Label>
                  <Input
                    id="saber_puntaje"
                    name="saber_puntaje"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.saber_puntaje}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="autoevaluacion_ser">
                    Autoevaluación Ser (0-100)
                  </Label>
                  <Input
                    id="autoevaluacion_ser"
                    name="autoevaluacion_ser"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.autoevaluacion_ser}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoevaluacion_decidir">
                    Autoevaluación Decidir (0-100)
                  </Label>
                  <Input
                    id="autoevaluacion_decidir"
                    name="autoevaluacion_decidir"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.autoevaluacion_decidir}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario">Comentario</Label>
                <textarea
                  id="comentario"
                  name="comentario"
                  placeholder="Observaciones o comentarios sobre el desempeño del estudiante"
                  value={formData.comentario}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createNotaMutation.isPending || updateNotaMutation.isPending}
              >
                {(createNotaMutation.isPending || updateNotaMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {currentNota ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notas;
