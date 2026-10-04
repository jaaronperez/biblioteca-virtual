# Proyecto: Biblioteca Virtual Eclesiástica

Resumen de `APP BASE DE DATOS ECLESIASTICA 1.pptx` (9 diapositivas).

## Objetivo

Desarrollar una plataforma web o móvil que permita la digitalización, almacenamiento, indexación y consulta de libros eclesiásticos completos, usando una arquitectura en la nube con bases de datos NoSQL para garantizar escalabilidad y búsquedas rápidas.

## Roles (equipos de 4-5 integrantes)

- **Project Manager / Scrum Master:** coordina la logística de escaneo, tiempos y entregas.
- **DevOps & Cloud Engineer:** configura la base de datos NoSQL, el almacenamiento en la nube y los pipelines de OCR.
- **Backend Developer:** desarrolla la API de consulta y la lógica de procesamiento de archivos.
- **Frontend/Mobile Developer:** diseña la interfaz de usuario para la consulta de libros.
- **QA & Data Specialist** (solo equipos de 5): asegura la calidad del OCR, la indexación y las pruebas de carga.

## Cronograma (8 semanas)

### Fase 1: Arquitectura y logística (semanas 1-2)

**Hito:** diseñar la arquitectura y arrancar el proceso de escaneo.

- Diseñar el modelo de datos en NoSQL (JSON estructurado para metadatos del libro, capítulos y páginas).
- Configurar el entorno en la nube (base de datos y storage).
- Estrategia de escaneo: crear un pipeline de digitalización y dividir los 3000 libros entre el equipo (escáneres cenitales o apps móviles de alta velocidad).
- Meta: ~375 libros semanales por equipo, por lo que se recomienda automatizar la subida en lote (Bulk Upload).

### Fase 2: Pipeline de datos y backend (semanas 3-4)

**Hito:** API funcional y procesamiento automático de libros.

- Script/servicio que reciba los libros escaneados, los suba al Storage de la nube y dispare el OCR.
- Guardar en NoSQL el texto extraído, indexado por palabras clave (búsqueda dentro del libro).
- Endpoints de búsqueda avanzada (por fecha, iglesia, tipo de libro o palabras clave).

### Fase 3: Desarrollo de interfaz (semanas 5-6)

**Hito:** frontend integrado con la base de datos.

- Interfaz consistente y adaptable a distintos dispositivos móviles, con experiencia accesible.
- Buscador con filtros dinámicos.
- Módulo de administración para observar el progreso de los escaneos.

### Fase 4: Pruebas, optimización y cierre (semanas 7-8)

**Hito:** sistema en producción y entrega de la base de datos poblada.

- Pruebas de carga en la base NoSQL para asegurar que soporta las consultas de miles de libros.
- Optimización de índices de búsqueda.
- Presentación final y entrega del repositorio.

## Criterios de evaluación

| Criterio | Peso |
|---|---|
| Arquitectura NoSQL y nube | 40% |
| Funcionamiento del pipeline | 20% |
| Gestión de proyecto y avance de escaneo | 10% |
| Interfaz de usuario | 10% |

> Los pesos suman 80%. El 20% restante no aparece en el PowerPoint.

## Ejemplo de cómo debe verse la app móvil

El PowerPoint incluye capturas de Kindle (inicio con buscador, categorías y portadas) y de Gospel Library (biblioteca en cuadrícula por categorías) como referencia visual. Pantallas esperadas:

- Pantalla de inicio
- Clasificación por categorías
- Detalles del libro (título, autor, descripción, etc.)
- Navegación entre módulos
- Diseño de interfaz
