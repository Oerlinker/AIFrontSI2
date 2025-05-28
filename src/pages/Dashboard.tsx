import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, ClipboardCheck, Grid2X2, AlertCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DashboardStats, EstudianteDashboard, ComparativoRendimiento } from '@/types/academic';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATIVO';
  const isProfesor = user?.role === 'PROFESOR';
  const isEstudiante = user?.role === 'ESTUDIANTE';

  // Consultar datos estadísticos generales
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: api.fetchDashboardEstadisticas,
  });

  // Si el usuario es estudiante, consultar su dashboard específico
  const { data: estudianteDashboard, isLoading: isLoadingEstudiante } = useQuery({
    queryKey: ['dashboard-estudiante'],
    queryFn: () => api.fetchEstudianteDashboard(),
    enabled: isEstudiante,
  });



  // Función para convertir nombres de trimestres
  const mapearTrimestre = (trimestre: string) => {
    const trimMap: Record<string, string> = {
      'PRIMERO': '1er Trim',
      'SEGUNDO': '2do Trim',
      'TERCERO': '3er Trim',
    };
    return trimMap[trimestre] || trimestre;
  };

  // Procesamiento de datos para gráficos de notas por trimestre
  const notasData = useMemo(() => {
    // Si no existen trimestres_stats o stats es undefined, usamos datos de ejemplo
    if (!stats?.trimestres_stats || stats.trimestres_stats.length === 0) {
      // Datos de ejemplo para cuando no hay trimestres
      return [
        { name: '1er Trim', promedio: 0 },
        { name: '2do Trim', promedio: 0 },
        { name: '3er Trim', promedio: 0 }
      ];
    }

    // Mapear trimestres a formato para gráficos
    return stats.trimestres_stats.map(trimestre => ({
      name: mapearTrimestre(trimestre.trimestre),
      promedio: trimestre.promedio
    }));
  }, [stats]);

  // Datos para gráfico de asistencia
  const asistenciaData = useMemo(() => {
    const asistenciaProm = stats?.asistencia_promedio ?? 0;

    return [
      { name: 'Presente', value: asistenciaProm, color: '#059669' },
      { name: 'Ausente', value: 100 - asistenciaProm, color: '#dc2626' }
    ];
  }, [stats]);

  // Datos para gráfico de estadísticas por materia
  const materiasData = useMemo(() => {
    if (!stats?.materias_stats || stats.materias_stats.length === 0) {
      return [];
    }

    return stats.materias_stats.map(materia => ({
      materia: materia.nombre,
      estudiantes: materia.total_estudiantes,
      promedio: materia.promedio_notas
    }));
  }, [stats]);

  // Datos para distribución de predicciones
  const prediccionesData = useMemo(() => {
    if (!stats?.predicciones_distribucion || stats.predicciones_distribucion.length === 0) {
      return [];
    }

    const colorMap: Record<string, string> = {
      'ALTO': '#059669', // Verde para rendimiento alto
      'MEDIO': '#eab308', // Amarillo para rendimiento medio
      'BAJO': '#dc2626'   // Rojo para rendimiento bajo
    };

    return stats.predicciones_distribucion.map(item => ({
      name: item.nivel_rendimiento,
      value: item.cantidad,
      color: colorMap[item.nivel_rendimiento] || '#6366f1'
    }));
  }, [stats]);

  const isLoading = isLoadingStats || (isEstudiante && isLoadingEstudiante) || (isAdmin);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-academic-blue border-t-transparent" />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-12 w-12 mb-2" />
        <h3 className="text-lg font-medium">Error al cargar el dashboard</h3>
        <p>No se pudieron obtener los datos. Por favor intenta de nuevo más tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-academic rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              ¡Bienvenido/a, {user?.first_name}!
            </h1>
            <p className="text-white/90 text-lg">
              {user?.role === 'ADMINISTRATIVO'
                ? 'Panel de administración del sistema académico'
                : 'Dashboard de gestión académica'
              }
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 mb-2">
              {user?.role}
            </Badge>
            <p className="text-white/80 text-sm">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Estudiantes
            </CardTitle>
            <User className="h-5 w-5 text-academic-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.total_estudiantes ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Estudiantes activos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Materias
            </CardTitle>
            <Calendar className="h-5 w-5 text-academic-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.total_materias ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Materias registradas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Promedio General
            </CardTitle>
            <ClipboardCheck className="h-5 w-5 text-academic-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(stats?.promedio_general ?? 0).toFixed(1)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Calificación promedio
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Asistencia
            </CardTitle>
            <Grid2X2 className="h-5 w-5 text-academic-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {(stats?.asistencia_promedio ?? 0).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Promedio de asistencia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de Notas */}
        {notasData.length > 0 && (
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Tendencia de Notas
              </CardTitle>
              <CardDescription>
                Evolución del promedio académico por trimestre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={notasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}`, 'Promedio']}
                  />
                  <Line
                    type="monotone"
                    dataKey="promedio"
                    stroke="#1e40af"
                    strokeWidth={3}
                    dot={{ fill: '#1e40af', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Distribución de Asistencia */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Distribución de Asistencia
            </CardTitle>
            <CardDescription>
              Porcentaje de asistencia general
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={asistenciaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${Number(value).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {asistenciaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Predicciones por Nivel */}
      {prediccionesData.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Predicciones de Rendimiento
            </CardTitle>
            <CardDescription>
              Distribución de estudiantes según nivel de rendimiento predicho
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prediccionesData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prediccionesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, 'Estudiantes']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Materias y Promedios */}
      {materiasData.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Estadísticas por Materia
            </CardTitle>
            <CardDescription>
              Promedio de notas por materia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materiasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="materia" stroke="#666" />
                <YAxis stroke="#666" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}`, 'Promedio']}
                />
                <Bar
                  dataKey="promedio"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  name="Promedio"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
