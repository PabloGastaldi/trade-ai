// ─────────────────────────────────────────────
// GUÍA OPERATIVA DE IMPORTACIÓN ARGENTINA
// Fuente: Manual de Aduanas — Juarez et al. (2018)
// Se inyecta dinámicamente en consultas de importación.
// ─────────────────────────────────────────────
export const GUIA_IMPORTACION = `
GUIA OPERATIVA DE IMPORTACION ARGENTINA


1. PASO A PASO DE UNA IMPORTACION A CONSUMO

1.1 Concepto de importacion para consumo
La destinacion definitiva de importacion, denominada importacion para consumo, es aquella por la cual la mercaderia se incorpora al circuito economico del territorio aduanero sin reconocer trabas a su libre circulacion interna. Constituye el hecho gravado por los derechos de importacion (art. 635 del CA).

1.2 Condicion previa: inscripcion del importador
Tanto las personas fisicas como las personas juridicas deben inscribirse en el Registro de Exportadores e Importadores de la Direccion General de Aduanas (DGA). Esta inscripcion otorga habilitacion para el acceso al Sistema Informatico Malvina (SIM). Sin esta inscripcion, no es posible oficializar ninguna destinacion de importacion.

1.3 Secuencia operativa paso a paso

1 [HISTORICO - ELIMINADO DESDE 26/02/2025] Sistemas de informacion anticipada (SIMI / SIRA / SEDI)
ATENCION: A partir del 26/02/2025, este paso ya NO existe. La RGC 5651/2025 (ARCA + Secretaria de Industria y Comercio, B.O. 25/02/2025) elimino el SEDI y toda la cadena de sistemas de informacion anticipada. El importador puede pasar directamente al arribo del medio de transporte sin tramitar ningun sistema previo.

2 Arribo del medio de transporte y presentacion ante aduana
La empresa de transporte presenta ante el Servicio Aduanero el Manifiesto de Carga (declaracion sumaria). El ATA ingresa los datos en el Modulo Manifiesto del SIM. El manifiesto pasa por los estados: En curso -> Registrado -> Presentado ante aduana.

3 Descarga e ingreso a deposito provisorio de importacion
La mercaderia descargada queda sometida al Regimen de Deposito Provisorio de Importacion. El depositario asienta la recepcion cotejando el manifiesto con las referencias de los bultos. Alternativamente puede tramitarse el Despacho Directo a Plaza: sin deposito provisorio, la mercaderia se despacha directamente desde el medio de transporte.

4 Plazo para destinar: obligacion del importador
El importador debe solicitar una destinacion dentro del plazo de 15 dias desde el arribo del medio transportador. Si no lo hace, se aplica automaticamente una multa equivalente al 1% del valor en aduana de la mercaderia. Si ignora el contenido, puede declararlo dentro de los primeros 10 dias del arribo; tiene hasta 25 dias totales para dar destinacion.

5 Confeccion de la Declaracion Aduanera por el Despachante de Aduana
El Despachante ingresa en el SIM (Modulo Declaracion Detallada) todos los datos de la destinacion. La declaracion debe incluir toda circunstancia necesaria para la correcta clasificacion arancelaria y valoracion.

Documentos base para la confeccion:
- Conocimiento de Embarque (B/L), Guia Aerea (AWB) o Carta de Porte
- Factura Comercial
- Lista de Empaque (cuando proceda)
- Certificado de Origen (cuando la mercancia venga negociada en acuerdo ALADI/MERCOSUR)
- Declaracion de Valor en Aduana (Formulario OM 1993/1-A)
- Autorizaciones/intervenciones de organismos terceros (ANMAT, SENASA, RENAR, ARN, INV, INAL, etc., segun el producto)

6 Oficializacion de la destinacion: pago de tributos y registro en el SIM
El despachante procede a la oficializacion en el SIM, previo pago y/o constitucion de garantia de los tributos correspondientes. El SIM otorga un numero de despacho definitivo, afecta los fondos de la subcuenta Malvina, cancela el documento de transporte y asigna automaticamente el canal de selectividad.

7 Presentacion ante aduana y asignacion de canal de selectividad
El Sistema Malvina asigna automaticamente el canal. Existen 3 canales:
- CANAL VERDE: Se autoriza el libramiento de forma inmediata. Sin control fisico. Refleja el principio del 'Despacho en Confianza'.
- CANAL NARANJA: Control documental estricto sin verificacion fisica. Se aplica cuando el regimen exige documentacion adicional o hay cupos. Si surgen discrepancias se puede pasar a canal rojo.
- CANAL ROJO: Control documental + verificacion fisica obligatoria como condicion previa al libramiento.

8 Extraccion de muestras (si el canal lo requiere)
Durante todo el procedimiento de extraccion, identificacion y acondicionamiento debe estar presente el interesado (importador, despachante o apoderado).

9 Verificacion de la mercaderia (canal rojo)
El verificador controla la mercaderia contra lo declarado. El interesado pierde el derecho a reclamar si no se presenta. Si hay diferencias, el servicio aduanero puede aceptar la declaracion, solicitar rectificacion o formular denuncia por declaracion inexacta (art. 954 del CA).

10 LIBRAMIENTO: autorizacion de retiro
Realizados los controles y abonados los tributos, el Servicio Aduanero autoriza el retiro de la mercaderia y su salida de la Zona Primaria Aduanera. La destinacion se considera consumada con el libramiento.

1.4 Regimen simplificado de importacion
Para operaciones de bajo monto: FOB maximo u$s 3.000, apenas 4 operaciones mensuales por importador. La mercaderia debe ser nueva. Alicuota aplicable: tarifa unificada del 50% del valor.

1.5 Organismos intervinientes por tipo de producto
- ANMAT: drogas, medicamentos, productos quimicos, alimentos acondicionados, cosmeticos, materiales en contacto con alimentos.
- SENASA: productos agroalimentarios de origen animal y vegetal.
- RENAR: armas, municiones y materiales de guerra o uso civil.
- ARN (Autoridad Regulatoria Nuclear): productos con material radioactivo.
- DGFM (Fabricaciones Militares): explosivos o sustancias que puedan provocar liberacion subita de energia.
- INV (Instituto Nacional de Vitivinicultura): vinos, mostos, bebidas alcoholicas, alcoholes.
- DNCI: instrumentos de medicion (exige unidades del Sistema Metrico Legal Argentino).


2. SISTEMAS DE CONTROL PREVIO A LA IMPORTACION: SIRA Y SEDI

ESTADO ACTUAL (vigente desde 26/02/2025): NO existe ningun sistema de declaracion previa obligatoria.
La Resolucion General Conjunta 5651/2025 (ARCA + Secretaria de Industria y Comercio, B.O. 25/02/2025) elimino el SEDI. El importador puede oficializar directamente la destinacion en el SIM (Malvina) sin ningun numero identificador previo.

Cronologia historica: DJAI (2012-2015) -> SIMI (2015-2022) -> SIRA (2022-2023) -> SEDI (2023-2025) -> ELIMINADO.

Nota: la RGC 5651/2025 mantiene vigentes los articulos 10, 11 y 12 de la RGC 5466/2023, que regulan el 'Padron de Deuda Comercial por Importaciones con Proveedores del Exterior' (vinculado a los BOPREAL).


3. CANALES DE SELECTIVIDAD ADUANERA: QUE IMPLICA CADA UNO

Principio general: la asignacion del canal es automatica (el Sistema Malvina, sin intervencion discrecional).

Canal Verde:
- Libramiento inmediato sin verificacion fisica.
- El estado cambia de 'Oficializado' a 'Autorizacion a Retiro' de forma directa.
- Es el canal mas rapido. Maximo nivel de confianza del sistema.

Canal Naranja:
- Control documental estricto, sin verificacion fisica.
- Se aplica cuando el regimen exige documentacion adicional o la mercaderia esta bajo cupos.
- El estado queda en 'Presentado' hasta que el verificador documental resuelva.
- Si hay discrepancias que justifiquen verificacion fisica, se pasa a canal rojo.

Canal Rojo:
- Control documental + verificacion fisica obligatoria como condicion previa al libramiento.
- El estado queda en 'Presentado' hasta que el verificador ingrese el 'Resultado de la Verificacion'.
- El interesado DEBE estar presente. Si no concurre, pierde el derecho a reclamar contra el resultado.
- El verificador puede extraer muestras.


4. COSTOS TOTALES DE IMPORTACION

4.1 Tributos en la importacion a consumo

1. Derechos de Importacion (DI): 0% a 35% segun AEC del MERCOSUR. Base: Valor CIF. Puede reducirse con preferencias arancelarias + Certificado de Origen.
2. Tasa de Estadistica: 0,5% (ejemplo del manual) s/ CIF. Consultar alicuota vigente en Tarifar.
3. IVA General: 21% (alicuota general) o 10,5% (reducida para bovinos, carnes, frutas y hortalizas frescas). Base: CIF + DI + Tasa Estadistica.
4. IVA Adicional (percepcion): 20% cuando IVA general = 21% / 10% cuando IVA = 10,5%. Misma base que IVA general. No aplica a bienes de uso ni consumo particular ni bovinos.
5. Anticipo Impuesto a las Ganancias: 6% (bienes para comercializacion) / 11% (uso personal). Base: misma que IVA.
6. Impuestos Internos (si aplica): variable. Grava bebidas alcoholicas y no alcoholicas, cigarros, cigarrillos, hornos microondas, aparatos de sonido/video, vehiculos diesel.
7. Derechos Antidumping (si aplica): variable. Se aplica cuando se comprueba practica de dumping.
8. Ingresos Brutos (percepcion provincial): variable segun provincia. La DGA recauda como agente de percepcion.
9. Registro SIM: u$s 10 por operacion (fijo).

FUENTE INSUFICIENTE PARA: Honorarios del despachante (consultar www.cda.org.ar), costos de almacenamiento en deposito fiscal, costos de verificacion fisica, flete interno, gastos bancarios, seguros de carga, certificaciones de organismos.


5. COMO CALCULAR EL COSTO DE IMPORTACION: FORMULA REAL

Formula sistematizada (base: ejemplo del manual, NCM 9005.80.00, DI 14%, via aerea, para comercializacion):

PASO 1: Valor en Aduana (CIF) = FOB + Flete Internacional + Seguro Internacional
PASO 2: Derecho de Importacion (DI) = CIF x alicuota DI (segun NCM, 0% a 35%)
PASO 3: Tasa de Estadistica (TE) = CIF x alicuota TE (ej: 0,5%)
PASO 4: Base IVA = CIF + DI + TE
PASO 5: IVA General = Base IVA x 21% (o 10,5% reducida)
PASO 6: IVA Adicional = Base IVA x 20% (si IVA 21%) o 10% (si IVA 10,5%)
PASO 7: Anticipo Ganancias = Base IVA x 6% (comercializacion) o 11% (uso personal)
PASO 8: Impuestos Internos (si aplica) = Base especifica x Tasa efectiva

TOTAL TRIBUTOS = DI + TE + IVA General + IVA Adicional + Ganancias + Imp. Internos (si aplica) + Ingresos Brutos (si aplica) + Antidumping (si aplica)

Ejemplo del manual: FOB u$s 3.000 + Flete+Seguro u$s 250 = CIF u$s 3.250
DI (14%): u$s 455 | TE (0,5%): u$s 16,25 | Base IVA: u$s 3.721,25
IVA 21%: u$s 781,46 | IVA Adicional 20%: u$s 744,25 | Ganancias 6%: u$s ~223
TOTAL TRIBUTOS: aprox. u$s 2.220 (aprox. 74% del FOB)


6. VALORACION EN ADUANA: QUE ES EL VALOR CIF Y COMO SE CALCULA

Marco normativo: Argentina aplica el Acuerdo de la OMC (Art. VII del GATT), Ley 23.311, Decreto 1026/87.

Concepto clave: Argentina aplica la totalidad de los ajustes facultativos del Art. 8.2 del Acuerdo de la OMC, conformando un Valor en Aduana en condicion CIF.

Formula:
Valor en Aduana CIF = Precio FOB + Flete Internacional + Gastos de Carga/Descarga + Seguro Internacional

Metodo principal: Valor de Transaccion (VT) = Precio realmente pagado o por pagar + Ajustes del Articulo 8.
El VA es el VT siempre que no existan: restricciones a la cesion del producto; condiciones que afecten el precio; reversiones al vendedor; vinculacion comprador-vendedor que afecte el valor.

Cuando existe vinculacion entre comprador y vendedor (control del 5%+ de acciones, relacion familiar, empleador-empleado, etc.), el servicio aduanero puede cuestionar el valor de transaccion.

Metodos alternativos (en orden de precedencia si no puede determinarse el VT):
1. VT mercancias identicas
2. VT mercancias similares
3. Metodo Deductivo (precio de venta en mercado interno menos costos)
4. Metodo Reconstructivo (costo de produccion)
5. Metodo del ultimo recurso


Documento generado en base exclusiva al Manual de Aduanas - Juarez et al. (2018) | trade.ai
`
