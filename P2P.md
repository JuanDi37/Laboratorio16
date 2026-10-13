# P2P — Arquitectura, infraestructura y responsabilidad

## Escenario y alcance

Analizamos dos peers autorizados que intercambian mensajes y un archivo de prueba. La página ejecuta un modelo determinista, no sockets reales. El topic de demostración no se presenta como el topic de clase, que no fue proporcionado.

## Arquitectura

Pear proporciona el entorno del ecosistema; Hyperswarm descubre participantes y establece conexiones; Hypercore organiza un registro append-only autenticado. Una DHT ayuda a encontrar peers y nodos bootstrap facilitan el contacto inicial. El plano de descubrimiento no almacena automáticamente el archivo que viaja por el plano de datos.

```text
Peer A → bootstrap / DHT ← Peer B
Peer A ← socket / mensajes → Peer B
Hypercore A ← replicación de bloques → Hypercore B
```

Un topic común de 32 bytes agrupa descubrimiento. No es una autorización de lectura. La clave pública del Hypercore identifica el registro; su discoveryKey sirve al descubrimiento correspondiente. La capacidad de escribir, verificar bloques y obtener una copia son funciones distintas.

## Intercambio y archivo

El ejemplo de mensajes usa JSON delimitado por salto de línea con acumulación y límite de tamaño. Los eventos data no definen límites de mensajes. Para una aplicación real habría que manejar UTF-8 fragmentado mediante StringDecoder, autorizar peers, validar el esquema y aplicar controles de flujo.

Un escritor incorpora el archivo al registro. El lector solicita bloques y puede conservarlos. Una lectura selectiva no significa réplica completa. La autenticación de bloques permite verificar lo recibido, pero no fabrica datos que ningún participante disponible conserva.

## Kill-seeder

| Situación | Interpretación |
| --- | --- |
| Seeder sale antes de completar; no hay otra copia | Faltan bloques; descarga detenida |
| Seeder sale; otro peer conserva todos los bloques | Otra fuente puede completar la descarga |
| Receptor completó antes de la salida | Lectura local posible |
| Existen peers conectados sin bloques relevantes | No mejora la disponibilidad del archivo faltante |

El modelo usa cuatro bloques lógicos y no mide ancho de banda. Añadir la réplica representa un peer que ya tenía el objeto completo, no una copia creada de la nada después de la interrupción.

## Dependencias y observabilidad

La red depende de conectividad, políticas NAT, firewalls, bootstrap y peers que sostengan copias. Las contrapartes pueden conocer información de conexión. P2P no implica anonimato y el cifrado de transporte no oculta necesariamente horarios, volumen ni pertenencia a un topic.

## Responsabilidad

Napster muestra archivos distribuidos con índice central. Grokster ilustra que el análisis de inducción de infracción no desaparece al distribuir infraestructura. BitTorrent organiza piezas en swarms con conservación por peers. No deducimos legitimidad del contenido a partir del protocolo. El venture define contenidos permitidos, participantes autorizados y responsabilidades de conservación.

## Aprendizaje

Aprendimos a evaluar disponibilidad por bloques útiles y responsabilidades concretas. La arquitectura evita un servidor central de aplicación, pero mantiene infraestructura y obligaciones operativas.
