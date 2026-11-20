import { Link } from 'react-router-dom';
import { EncabezadoPagina, Vacio } from '../components/UI';

// Página temporal para los módulos que se construyen en las siguientes entregas.
export default function EnConstruccion({ titulo }) {
  return (
    <>
      <EncabezadoPagina titulo={titulo} descripcion="Este módulo se habilita en las próximas entregas." />
      <Vacio>
        Módulo en construcción. <Link to="/dashboard">Volver al panel</Link>
      </Vacio>
    </>
  );
}
