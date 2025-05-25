import React, {createContext, useContext, useReducer, useEffect} from 'react';
import {AuthState, User, LoginCredentials, AuthResponse} from '@/types/auth';
import api from '@/services/api';
import {toast} from '@/hooks/use-toast';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
    | { type: 'LOGIN_START' }
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
    | { type: 'LOGIN_FAILURE'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'UPDATE_USER'; payload: User }
    | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } };

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN_START':
            return {...state, isLoading: true, error: null};
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            };
        case 'LOGIN_FAILURE':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
            };
        case 'LOGOUT':
            return initialState;
        case 'UPDATE_USER':
            return {...state, user: action.payload};
        case 'RESTORE_SESSION':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
            };
        default:
            return state;
    }
}

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        // Restaurar sesión desde localStorage
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                dispatch({type: 'RESTORE_SESSION', payload: {user, token}});
            } catch (error) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            }
        }
    }, []);

    const login = async (credentials: LoginCredentials): Promise<boolean> => {
        dispatch({type: 'LOGIN_START'});

        try {
            console.log('Realizando solicitud de login al servidor...');
            const response = await api.login(credentials);
            console.log('Respuesta completa del login:', response);

            // Depuración detallada de la estructura del usuario
            console.log('Estructura del usuario:', JSON.stringify(response.user, null, 2));
            console.log('Propiedades del usuario:', Object.keys(response.user));
            console.log('Rol del usuario:', response.user.role);

            // Verificar si la respuesta contiene los campos necesarios
            if (!response.access) {
                console.error('Error: No se encontró el token de acceso en la respuesta');
                throw new Error('La respuesta del servidor no contiene el token de acceso');
            }

            if (!response.user) {
                console.error('Error: No se encontró información del usuario en la respuesta');
                throw new Error('La respuesta del servidor no contiene información del usuario');
            }

            // Adaptación para manejar el rol que podría venir como 'role' en lugar de 'rol'
            const user = response.user;
            if (user.role && !user.role) {
                console.log('Adaptando campo "role" a "rol"');
                user.role = user.role;
            }

            console.log('Estructura del usuario adaptada:', JSON.stringify(user, null, 2));
            console.log('Estructura de la respuesta correcta, guardando en localStorage');

            // Guardar en localStorage - corregido para usar las mismas claves que el interceptor de axios
            localStorage.setItem('accessToken', response.access);
            localStorage.setItem('refreshToken', response.refresh); // Guardar también el refresh token
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {user, token: response.access},
            });

            toast({
                title: "Inicio de sesión exitoso",
                description: `Bienvenido/a ${user.first_name}`,
            });

            return true;
        } catch (error) {
            console.error('Error de login:', error);

            // Intentar mostrar más información sobre el error
            let errorMessage = 'Error al iniciar sesión';

            if (error.response) {
                console.error('Datos de respuesta del error:', error.response.data);
                console.error('Estado HTTP:', error.response.status);
                console.error('Cabeceras de respuesta:', error.response.headers);

                errorMessage = error.response.data?.detail ||
                    (typeof error.response.data === 'string' ? error.response.data : errorMessage);
            } else if (error.request) {
                console.error('No se recibió respuesta del servidor:', error.request);
                errorMessage = 'No se pudo conectar con el servidor';
            } else if (error.message) {
                console.error('Mensaje de error:', error.message);
                errorMessage = error.message;
            }

            dispatch({type: 'LOGIN_FAILURE', payload: errorMessage});

            toast({
                title: "Error de autenticación",
                description: errorMessage,
                variant: "destructive",
            });

            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        dispatch({type: 'LOGOUT'});

        toast({
            title: "Sesión cerrada",
            description: "Has cerrado sesión correctamente",
        });
    };

    const updateUser = (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        dispatch({type: 'UPDATE_USER', payload: user});
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
