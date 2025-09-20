# Script Frames - Grabador de Señas

## 📝 Descripción

**Script Frames** es una aplicación web moderna para grabar señas en formato de frames y exportarlas en archivos ZIP organizados. Está diseñada específicamente para la captura de datos de entrenamiento para modelos de reconocimiento de señas.

## ✨ Características principales

### 🎥 **Grabación de video**
- Captura exactamente **50 frames** en 5 segundos (10 FPS)
- Interfaz intuitiva con dos vistas: inicial y grabación
- Vista previa en tiempo real de la cámara
- Barra de progreso durante la captura

### 📁 **Exportación organizada**
- Estructura de carpetas automática: `nombre_seña/nombre_seña_001/frame_001.jpg`
- Numeración con 3 dígitos para perfecta organización
- Múltiples grabaciones por seña en un solo ZIP
- Calidad de imagen optimizada (JPEG 80%)

### 🎨 **Interfaz moderna**
- Diseño responsive y accesible
- Paleta de colores profesional
- Animaciones suaves y transiciones
- Soporte para dispositivos móviles

## 🛠️ Tecnologías utilizadas

- **HTML5**: Estructura semántica y accesible
- **CSS3**: Variables CSS, Grid, Flexbox, animaciones
- **JavaScript ES6+**: Módulos, async/await, clases
- **APIs Web**: getUserMedia, Canvas, File API
- **Librerías externas**:
  - [JSZip](https://stuk.github.io/jszip/) - Creación de archivos ZIP
  - [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - Descarga de archivos

## 📂 Estructura del proyecto

```
script-frames/
├── index.html          # Página principal
├── styles.css          # Hoja de estilos
├── script.js           # Lógica de la aplicación
└── README.md           # Documentación
```

## 🚀 Instalación y uso

### **Opción 1: Uso directo**
1. Descarga los archivos del repositorio
2. Abre `index.html` en tu navegador moderno
3. Concede permisos de cámara cuando se solicite
4. ¡Comienza a grabar señas!

### **Opción 2: Servidor local**
```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (http-server)
npx http-server

# Luego visita: http://localhost:8000
```

## 📱 Compatibilidad

### **Navegadores soportados**
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

### **Dispositivos**
- 💻 Desktop (Windows, macOS, Linux)
- 📱 Móviles (Android, iOS)
- 📷 Requiere cámara web o cámara del dispositivo

## 🎯 Cómo usar la aplicación

### **Paso 1: Configuración inicial**
1. Ingresa el nombre de la seña (solo letras, números, guiones)
2. Haz clic en "Comenzar"
3. Concede permisos de cámara

### **Paso 2: Grabación**
1. Posiciónate frente a la cámara
2. Haz clic en "Iniciar grabación (5s)"
3. Aparecerá un countdown de 3 segundos para prepararte
4. Mantén la posición durante los 5 segundos de grabación
5. Repite para múltiples variaciones

### **Paso 3: Exportación**
1. Haz clic en "Finalizar y descargar ZIP"
2. El archivo se descarga automáticamente
3. Extrae y utiliza los frames para entrenamiento

## 📁 Estructura del ZIP generado

```
nombre_seña_2024-09-19.zip
└── nombre_seña/
    ├── nombre_seña_001/
    │   ├── frame_001.jpg
    │   ├── frame_002.jpg
    │   └── ... (50 frames)
    ├── nombre_seña_002/
    │   ├── frame_001.jpg
    │   ├── frame_002.jpg
    │   └── ... (50 frames)
    └── ...
```

## ⚡ Características técnicas

### **Configuración de grabación**
- **Duración**: 5 segundos exactos
- **FPS**: 10 frames por segundo
- **Total frames**: 50 por grabación
- **Formato**: JPEG con 80% de calidad
- **Resolución**: 640x480 (exacta)

### **Optimizaciones**
- Preload de recursos críticos
- Gestión eficiente de memoria
- Cleanup automático de recursos
- Validación robusta de entrada

### **Accesibilidad**
- Etiquetas ARIA para lectores de pantalla
- Navegación por teclado
- Alto contraste disponible
- Reducción de movimiento respetada

## 🔧 Configuración avanzada

### **Modificar parámetros de grabación**
```javascript
// En script.js, sección CONFIG
const CONFIG = {
    recording: {
        duration: 5000,        // Duración en ms
        targetFrames: 50,      // Número de frames
        quality: 0.8,          // Calidad JPEG (0.1-1.0)
        format: 'image/jpeg'   // Formato de imagen
    }
};
```

## 🐛 Solución de problemas

### **Error: "No se puede acceder a la cámara"**
- Verifica que el navegador tenga permisos de cámara
- Asegúrate de estar usando HTTPS o localhost
- Revisa que no haya otras aplicaciones usando la cámara

### **Error: "El ZIP no se descarga"**
- Verifica que el navegador permita descargas automáticas
- Comprueba el espacio libre en disco
- Prueba con menos grabaciones si el archivo es muy grande

## 🤝 Contribución

1. Fork del repositorio
2. Crea una rama para tu feature
3. Commit de cambios
4. Push a la rama
5. Abre un Pull Request

## 👥 Autores

- **Danielle Guillen** - *Desarrollo inicial* - [@danielle-guillen](https://github.com/danielle-guillen)

---

**¿Tienes preguntas o sugerencias?** ¡Abre un issue en GitHub!