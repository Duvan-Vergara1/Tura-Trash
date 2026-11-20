import { Link, Navigate, Route, Routes } from 'react-router-dom';
import RutaProtegida from './auth/RutaProtegida';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnConstruccion from './pages/EnConstruccion';
import Vehiculos from './pages/Vehiculos';
import Conductores from './pages/Conductores';
import Barrios from './pages/Barrios';
import Rutas from './pages/Rutas';
import RutaEditor from './pages/RutaEditor';

function NoEncontrado() {
  return (
    <div className="vacio">
      <h1>Página no encontrada</h1>
      <p>
        <Link to="/dashboard">Volver al panel</Link>
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vehiculos" element={<Vehiculos />} />
          <Route path="/conductores" element={<Conductores />} />
          <Route path="/barrios" element={<Barrios />} />
          <Route path="/rutas" element={<Rutas />} />
          <Route path="/rutas/nueva" element={<RutaEditor />} />
          <Route path="/rutas/:id" element={<RutaEditor />} />
          <Route path="/programacion" element={<EnConstruccion titulo="Programación" />} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
