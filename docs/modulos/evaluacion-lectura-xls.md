# Lectura del .xls de «DTE recibidos» de la SAT (agente de seguridad, 2026-11-01)

La SAT entrega la consulta de DTE recibidos como **Excel 97-2003 (BIFF8 en contenedor OLE2/CFB)**.
Cambia la decisión L4-e (rechazar .xls). El archivo real (con datos personales) **no** entra al repositorio.

## Estructura del archivo real

- CFB v3, sectores de 512; directorio solo `Root Entry` y `Workbook` (sin VBA, objetos ni cifrado).
- BIFF8, CODEPAGE 1200; una hoja `InformacionDTE-FEL`; SST de 170 cadenas; generado por Apache POI.
- Celdas: LABELSST, NUMBER y BLANK. Con muchas filas la SST tendrá CONTINUE.
- 33 columnas. Encabezados con variantes: «Tipo de DTE (nombre)» y los impuestos con el sufijo
  «(monto de este impuesto)» (p. ej. «IVA (monto de este impuesto)»).
- Fechas como **texto**: emisión `aaaa-mm-ddThh:mm:ss.mmm-hh:mm` o `aaaa-mm-ddThh:mm:ss` **sin zona**;
  anulación con zona y sin milisegundos, vacía si no aplica.
- Montos como número con 6 a 8 decimales. NIT, serie, número y establecimiento como texto.

## Comparación

| Opción | Veredicto |
|---|---|
| SheetJS (`xlsx`) | Descartada: npm 0.18.5 con CVE-2023-30533 y CVE-2024-22363; las corregidas solo en cdn.sheetjs.com (fuera de `npm audit`); mucha superficie. |
| **Lector propio CFB + BIFF8** | **Elegida (decisión del usuario 2026-11-01)**: ~400 líneas, sin dependencias, formato congelado ([MS-CFB], [MS-XLS]); mismo criterio que A1. |
| `cfb` + BIFF propio | Suma dependencia sin ahorro real. |
| LibreOffice aislado | >300 MB, historial de CVE. |
| Convertir en el navegador | Misma dependencia del CDN. |
| Pedir guardar como xlsx | Mala experiencia mensual. |

## Controles

1. Tope de 5 MB (ya en `leerFilas`).
2. Firma OLE2 `D0 CF 11 E0 A1 B1 1A E1`, byte order `0xFFFE`, v3/512 o v4/4096, mini sector 64, corte 4096;
   sectores de FAT/DIFAT no mayores que los que caben.
3. Cadenas de sectores con conjunto de visitados (ciclos), longitud máxima `ceil(tamaño/sector)+1`, índices en
   rango, sin FREESECT/FATSECT/DIFSECT dentro; tamaño de stream acotado.
4. Directorio con **lista blanca** (≤ 32 entradas): `Root Entry`, `Workbook`, `\x05SummaryInformation`,
   `\x05DocumentSummaryInformation`, `\x01CompObj`. Cualquier *storage* se rechaza (`_VBA_PROJECT_CUR`, `Macros`,
   `MBD*`, `ObjectPool`, cifrado) con `ExcelConContenidoNoPermitido`; stream `Book` (BIFF5) con
   `ExcelAntiguoNoAdmitido`.
5. BIFF: primer BOF `0x0600`/`0x0005`; registros ≤ 8,224 bytes; tope de registros proporcional; FILEPASS,
   BOUNDSHEET de macros (1, 6), NAME `Auto_Open`/`Auto_Close`, **OBJ y MSODRAWING** se rechazan (decisión del
   usuario).
6. SST: `cstUnique` ≤ 200,000 y ≤ bytes restantes / 3; `cch` ≤ 32,767; cruce de CONTINUE con su byte de flags;
   texto comprimido se decodifica como `latin1`.
7. Celdas: primera hoja por `lbPlyPos` (debe caer en un BOF); LABELSST, LABEL, NUMBER, RK, MULRK y el valor
   guardado de FORMULA (nunca se evalúa); filas < 10,001, columnas < 200; índices de SST válidos; MULRK/MULBLANK
   consistentes; luego `validarTopes`.
8. Todo error inesperado → `ArchivoNoLegible`, sin traza.
9. Lineal sobre ≤ 5 MB; medir con 10,000 filas; si pasa de ~300 ms, `worker_threads` con 64 MB y 5 s.
   Prototipo: 300 mutaciones, 0 errores no controlados, 0 cuelgues.

## Encaje

- `detectarFormato` → `'xls'` con la firma OLE2; `FormatoDeArchivo = 'xlsx' | 'xls' | 'csv'`.
- `infraestructura/lectura/xls/lector-de-cfb.ts`, `lector-de-biff8.ts`, `lectura/lector-de-xls.ts` → `FilaCruda[]`.
- Check `formato` de `lotes_de_dte` incluye `'xls'` (migración nueva); actualizar §3.3b.5, §3.3b.6, §3.3b.11 y L4-e.
- L4-6: mapa de encabezados con las variantes; fechas con o sin zona y milisegundos.

## Decisiones del usuario (2026-11-01)

- Lector propio en el servidor.
- Montos: **mínimo 2 decimales, según la configuración** (respetar la variable de decimales de la empresa o
  instalación, nunca menos de 2), y avisar si la suma no cuadra con el gran total.
- Fecha de emisión sin zona: **hora de Guatemala** (zona de la empresa).
- Rechazar OBJ y MSODRAWING.

## Pruebas

Escritor de prueba `xls-de-prueba.ts` (como `zip-de-prueba.ts`) con datos inventados; casos: 33 columnas, tres
formas de fecha, decimales largos, 10,000 filas con CONTINUE (cambio comprimido/UTF-16, tildes, ñ), topes de
filas/columnas/celda, storages prohibidos, macros y `Auto_Open`, FILEPASS, ciclos en FAT/DIFAT/directorio/mini
FAT (< 100 ms), sectores fuera de rango y truncado, `cstUnique` enorme, LABELSST inválido, MULRK inconsistente,
BIFF5, FORMULA sin evaluar, 500 mutaciones (< 1 s cada una), y siguen pasando HTML disfrazado, bomba zip y CSV.
