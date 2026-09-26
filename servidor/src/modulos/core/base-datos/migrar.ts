import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { grupoConexiones } from './conexion.js';
import { migrarModulos } from './migrador.js';

if (!configuracion.DATABASE_URL_PROPIETARIO) {
  console.error('Falta DATABASE_URL_PROPIETARIO para aplicar migraciones.');
  process.exit(1);
}

try {
  const migrados = await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO, definicionesModulos);
  console.log(`Migraciones aplicadas: ${migrados.join(', ') || 'ninguna'}`);
} finally {
  await grupoConexiones.end();
}
