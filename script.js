/**
 * SCRIPT FRAMES - GRABADOR DE SEÑAS
 * Aplicación para grabar señas en formato de frames y exportar en ZIP
 * 
 * @author Danielle Guillen
 * @version 1.0.0
 * @license MIT
 */

'use strict';

// =================================================================
// CONFIGURACIÓN GLOBAL
// =================================================================

/**
 * Configuración de la aplicación
 */
const CONFIG = {
    // Parámetros de grabación
    recording: {
        duration: 5000,        // 5 segundos
        targetFrames: 50,      // Mínimo 50 frames
        quality: 0.8,          // Calidad JPEG (0.1 - 1.0)
        format: 'image/jpeg'   // Formato de imagen
    },
    
    // Configuración de video
    video: {
        width: { exact: 640 },
        height: { exact: 480 },
        facingMode: 'user'
    },
    
    // Configuración de archivos
    files: {
        maxNameLength: 50,
        allowedChars: /^[a-zA-Z0-9_-]+$/,
        zipDateFormat: 'YYYY-MM-DD'
    },
    
    // Configuración de UI
    ui: {
        progressUpdateInterval: 100,
        statusDisplayDuration: 3000,
        animationDuration: 300,
        countdownDuration: 3000     // Timer de 3 segundos antes de grabar
    }
};

// =================================================================
// VARIABLES GLOBALES
// =================================================================

/**
 * Estado global de la aplicación
 */
const AppState = {
    // Elementos del DOM
    elements: {
        video: null,
        canvas: null,
        ctx: null
    },
    
    // Estado de grabación
    recording: {
        isActive: false,
        currentSession: null,
        counter: 0,
        data: []
    },
    
    // Estado de la cámara
    camera: {
        stream: null,
        isInitialized: false
    },
    
    // Estado de la aplicación
    app: {
        currentView: 'initial',
        currentSignName: '',
        isProcessing: false
    }
};

// =================================================================
// UTILIDADES Y HELPERS
// =================================================================

/**
 * Utilidades generales
 */
const Utils = {
    /**
     * Valida el nombre de una seña
     * @param {string} name - Nombre a validar
     * @returns {Object} Resultado de validación
     */
    validateSignName(name) {
        const trimmedName = name.trim();
        
        if (!trimmedName) {
            return { 
                isValid: false, 
                error: 'Por favor, ingresa un nombre para la seña' 
            };
        }
        
        if (trimmedName.length > CONFIG.files.maxNameLength) {
            return { 
                isValid: false, 
                error: `El nombre no puede tener más de ${CONFIG.files.maxNameLength} caracteres` 
            };
        }
        
        if (!CONFIG.files.allowedChars.test(trimmedName)) {
            return { 
                isValid: false, 
                error: 'El nombre solo puede contener letras, números, guiones (-) y guiones bajos (_)' 
            };
        }
        
        return { isValid: true, name: trimmedName };
    },

    /**
     * Formatea un número con ceros a la izquierda
     * @param {number} num - Número a formatear
     * @param {number} digits - Número de dígitos
     * @returns {string} Número formateado
     */
    padNumber(num, digits = 3) {
        return String(num).padStart(digits, '0');
    },

    /**
     * Genera un nombre de archivo único
     * @param {string} baseName - Nombre base
     * @param {string} extension - Extensión del archivo
     * @returns {string} Nombre de archivo único
     */
    generateFileName(baseName, extension = 'zip') {
        const timestamp = new Date().toISOString().split('T')[0];
        return `${baseName}_${timestamp}.${extension}`;
    },

    /**
     * Calcula el intervalo entre frames
     * @returns {number} Intervalo en milisegundos
     */
    getFrameInterval() {
        return CONFIG.recording.duration / CONFIG.recording.targetFrames;
    },

    /**
     * Muestra un mensaje de error
     * @param {string} message - Mensaje de error
     */
    showError(message) {
        // Mostrar en consola con más detalles
        console.error('Error:', message);
        console.trace('Stack trace del error');
        
        // Mostrar al usuario
        alert(message);
    },

    /**
     * Valida que las librerías externas estén disponibles
     * @returns {Object} Estado de las librerías
     */
    validateLibraries() {
        const libraries = {
            JSZip: typeof JSZip !== 'undefined',
            saveAs: typeof saveAs !== 'undefined'
        };
        
        const allLoaded = Object.values(libraries).every(loaded => loaded);
        
        if (!allLoaded) {
            this.log('Estado de librerías:', libraries);
        }
        
        return { libraries, allLoaded };
    },

    /**
     * Espera a que las librerías se carguen completamente
     * @param {number} timeout - Tiempo máximo de espera en ms
     * @returns {Promise<boolean>} True si todas las librerías se cargaron
     */
    async waitForLibraries(timeout = 10000) {
        const startTime = Date.now();
        let lastLogTime = 0;
        
        while (Date.now() - startTime < timeout) {
            const check = this.validateLibraries();
            if (check.allLoaded) {
                this.log('Todas las librerías cargadas correctamente');
                return true;
            }
            
            // Log cada 2 segundos para no saturar la consola
            const currentTime = Date.now();
            if (currentTime - lastLogTime > 2000) {
                this.log('Estado de librerías:', check.libraries);
                lastLogTime = currentTime;
            }
            
            // Esperar 200ms antes de volver a verificar
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        this.log('Timeout esperando librerías');
        return false;
    },

    /**
     * Log de depuración
     * @param {string} message - Mensaje
     * @param {any} data - Datos adicionales
     */
    log(message, data = null) {
        if (data) {
            console.log(`[ScriptFrames] ${message}`, data);
        } else {
            console.log(`[ScriptFrames] ${message}`);
        }
    }
};

// =================================================================
// GESTIÓN DE LA INTERFAZ DE USUARIO
// =================================================================

/**
 * Controlador de la interfaz de usuario
 */
const UIController = {
    /**
     * Inicializa los elementos del DOM
     */
    async init() {
        AppState.elements.video = document.getElementById('video');
        AppState.elements.canvas = document.getElementById('canvas');
        AppState.elements.ctx = AppState.elements.canvas.getContext('2d');
        
        this.bindEvents();
        
        // Esperar a que las librerías se carguen
        Utils.log('Esperando a que se carguen las librerías...');
        const librariesLoaded = await Utils.waitForLibraries();
        
        if (!librariesLoaded) {
            this.showLibraryError();
            return;
        }
        
        Utils.log('UI inicializada correctamente');
    },

    /**
     * Muestra error de librerías con opciones de solución
     */
    showLibraryError() {
        const libCheck = Utils.validateLibraries();
        let missingLibs = [];
        
        if (!libCheck.libraries.JSZip) missingLibs.push('JSZip');
        if (!libCheck.libraries.saveAs) missingLibs.push('FileSaver');
        
        Utils.log('Librerías faltantes:', missingLibs);
        
        // Intentar cargar FileSaver manualmente como último recurso
        if (!libCheck.libraries.saveAs) {
            Utils.log('Intentando cargar FileSaver manualmente...');
            this.loadFileSaverManually();
            
            // Esperar un poco más para ver si se carga
            setTimeout(() => {
                const finalCheck = Utils.validateLibraries();
                if (!finalCheck.allLoaded) {
                    const errorMsg = `No se pudieron cargar las librerías: ${missingLibs.join(', ')}.\n\n` +
                                    `Soluciones:\n` +
                                    `1. Recarga la página (F5)\n` +
                                    `2. Verifica tu conexión a internet\n` +
                                    `3. Desactiva temporalmente el antivirus/bloqueador\n` +
                                    `4. Prueba en modo incógnito`;
                    
                    Utils.showError(errorMsg);
                    this.showReloadButton();
                } else {
                    Utils.log('FileSaver cargado manualmente con éxito');
                    // Continuar con la inicialización
                    Utils.log('UI inicializada correctamente (con carga manual)');
                }
            }, 2000);
        } else {
            const errorMsg = `No se pudieron cargar las librerías: ${missingLibs.join(', ')}.\n\n` +
                            `Soluciones:\n` +
                            `1. Recarga la página (F5)\n` +
                            `2. Verifica tu conexión a internet\n` +
                            `3. Desactiva temporalmente el antivirus/bloqueador`;
            
            Utils.showError(errorMsg);
            this.showReloadButton();
        }
    },

    /**
     * Carga FileSaver manualmente como último recurso
     */
    loadFileSaverManually() {
        // Implementación básica de saveAs que siempre funciona
        window.saveAs = function(blob, filename) {
            try {
                Utils.log(`Descargando archivo: ${filename} (${(blob.size / 1024).toFixed(2)} KB)`);
                
                const a = document.createElement('a');
                const url = URL.createObjectURL(blob);
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Limpiar URL después de un tiempo
                setTimeout(() => {
                    try {
                        URL.revokeObjectURL(url);
                    } catch (e) {
                        // Ignorar errores de cleanup
                    }
                }, 1000);
                
                Utils.log('Archivo descargado exitosamente');
                
            } catch (error) {
                Utils.log('Error en descarga manual:', error);
                throw new Error('No se pudo descargar el archivo. Intenta con otro navegador.');
            }
        };
        
        Utils.log('FileSaver implementado manualmente');
    },

    /**
     * Muestra un botón para recargar la página
     */
    showReloadButton() {
        const container = document.querySelector('.container');
        if (container) {
            const reloadDiv = document.createElement('div');
            reloadDiv.innerHTML = `
                <div class="info-box" style="background-color: #ffebee; border-color: #f44336;">
                    <h3>⚠️ Error cargando recursos</h3>
                    <p>No se pudieron cargar las librerías necesarias.</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 15px;">
                        🔄 Recargar página
                    </button>
                </div>
            `;
            container.appendChild(reloadDiv);
        }
    },

    /**
     * Vincula eventos del DOM
     */
    bindEvents() {
        // Enter en el campo de texto
        const signNameInput = document.getElementById('signName');
        if (signNameInput) {
            signNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    AppController.startRecording();
                }
            });
        }

        // Cleanup al cerrar la página
        window.addEventListener('beforeunload', () => {
            CameraController.cleanup();
        });
    },

    /**
     * Cambia entre vistas
     * @param {string} viewName - Nombre de la vista
     */
    switchView(viewName) {
        const views = ['initialView', 'recordingView'];
        
        views.forEach(view => {
            const element = document.getElementById(view);
            if (element) {
                element.style.display = view === `${viewName}View` ? 'block' : 'none';
            }
        });
        
        AppState.app.currentView = viewName;
        Utils.log(`Vista cambiada a: ${viewName}`);
    },

    /**
     * Actualiza el estado de la interfaz
     * @param {string} message - Mensaje de estado
     * @param {string} type - Tipo de estado (idle, recording, error)
     */
    updateStatus(message, type = 'idle') {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status status-${type}`;
        }
        
        Utils.log(`Estado actualizado: ${message} (${type})`);
    },

    /**
     * Actualiza el contador de grabaciones
     */
    updateRecordingCounter() {
        const counterElement = document.getElementById('recordingCounter');
        if (counterElement) {
            counterElement.textContent = AppState.recording.counter;
        }
    },

    /**
     * Actualiza la barra de progreso
     * @param {number} progress - Progreso (0-100)
     */
    updateProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        
        if (progressBar && progressFill) {
            progressBar.style.display = progress > 0 ? 'block' : 'none';
            progressFill.style.width = `${Math.min(progress, 100)}%`;
        }
    },

    /**
     * Controla el estado de los botones
     * @param {Object} buttonStates - Estados de los botones
     */
    setButtonStates(buttonStates) {
        Object.entries(buttonStates).forEach(([buttonId, disabled]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = disabled;
            }
        });
    },

    /**
     * Actualiza el nombre de la seña en la UI
     * @param {string} signName - Nombre de la seña
     */
    updateSignName(signName) {
        const element = document.getElementById('currentSignName');
        if (element) {
            element.textContent = signName;
        }
    },

    /**
     * Resetea el formulario inicial
     */
    resetInitialForm() {
        const signNameInput = document.getElementById('signName');
        if (signNameInput) {
            signNameInput.value = '';
            signNameInput.focus();
        }
    }
};

// =================================================================
// GESTIÓN DE LA CÁMARA
// =================================================================

/**
 * Controlador de la cámara
 */
const CameraController = {
    /**
     * Inicializa la cámara
     */
    async init() {
        try {
            Utils.log('Iniciando cámara...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: CONFIG.video 
            });
            
            AppState.camera.stream = stream;
            AppState.elements.video.srcObject = stream;
            
            // Esperar a que el video esté listo
            await new Promise((resolve) => {
                AppState.elements.video.addEventListener('loadedmetadata', () => {
                    // Forzar dimensiones exactas del canvas a 640x480
                    AppState.elements.canvas.width = 640;
                    AppState.elements.canvas.height = 480;
                    Utils.log(`Canvas configurado a: ${AppState.elements.canvas.width}x${AppState.elements.canvas.height}`);
                    resolve();
                }, { once: true });
            });

            AppState.camera.isInitialized = true;
            UIController.updateStatus('Cámara iniciada. Listo para grabar', 'idle');
            Utils.log('Cámara inicializada correctamente');
            
        } catch (error) {
            Utils.log('Error al acceder a la cámara', error);
            UIController.updateStatus('Error al acceder a la cámara', 'error');
            Utils.showError('Error al acceder a la cámara. Por favor, verifica los permisos.');
            throw error;
        }
    },

    /**
     * Captura un frame de la cámara
     * @returns {string} Data URL de la imagen
     */
    captureFrame() {
        if (!AppState.camera.isInitialized) {
            throw new Error('Cámara no inicializada');
        }

        const { video, canvas, ctx } = AppState.elements;
        
        // Asegurar que el canvas tenga las dimensiones correctas
        if (canvas.width !== 640 || canvas.height !== 480) {
            canvas.width = 640;
            canvas.height = 480;
        }
        
        // Limpiar el canvas antes de dibujar
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar el video escalado/recortado para mantener 640x480
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL(CONFIG.recording.format, CONFIG.recording.quality);
    },

    /**
     * Limpia los recursos de la cámara
     */
    cleanup() {
        if (AppState.camera.stream) {
            AppState.camera.stream.getTracks().forEach(track => track.stop());
            AppState.camera.stream = null;
            AppState.camera.isInitialized = false;
            Utils.log('Recursos de cámara liberados');
        }
    }
};

// =================================================================
// GESTIÓN DE GRABACIÓN
// =================================================================

/**
 * Controlador de grabación
 */
const RecordingController = {
    /**
     * Inicia una sesión de grabación
     */
    async startSession() {
        if (AppState.recording.isActive) {
            Utils.log('Ya hay una grabación en curso');
            return;
        }

        Utils.log('Iniciando sesión de grabación');
        AppState.recording.isActive = true;

        // Configurar UI
        UIController.setButtonStates({
            recordBtn: true,
            downloadBtn: true
        });
        
        UIController.updateProgress(0);

        try {
            // Mostrar countdown de 3 segundos
            await this.showCountdown();
            
            // Iniciar grabación real
            const session = {
                signName: AppState.app.currentSignName,
                recordingNumber: AppState.recording.counter + 1,
                frames: [],
                startTime: Date.now()
            };

            AppState.recording.currentSession = session;
            await this.captureFrames(session);
            this.finishSession(session);
            
        } catch (error) {
            Utils.log('Error durante la grabación', error);
            UIController.updateStatus('Error durante la grabación', 'error');
            AppState.recording.isActive = false;
            
            UIController.setButtonStates({
                recordBtn: false,
                downloadBtn: AppState.recording.data.length > 0 ? false : true
            });
        }
    },

    /**
     * Muestra countdown de 3 segundos antes de grabar
     */
    async showCountdown() {
        return new Promise((resolve) => {
            let countdown = 3;
            
            const updateCountdown = () => {
                if (countdown > 0) {
                    // Usar clase especial para countdown con animación
                    const statusElement = document.getElementById('status');
                    if (statusElement) {
                        statusElement.textContent = `🕐 Preparándose... ${countdown}`;
                        statusElement.className = 'status status-countdown';
                    }
                    Utils.log(`Countdown: ${countdown}`);
                    countdown--;
                    setTimeout(updateCountdown, 1000);
                } else {
                    UIController.updateStatus('🔴 ¡GRABANDO! Mantén la posición', 'recording');
                    resolve();
                }
            };
            
            updateCountdown();
        });
    },

    /**
     * Captura frames durante la sesión
     * @param {Object} session - Sesión de grabación
     */
    async captureFrames(session) {
        const frameInterval = Utils.getFrameInterval();
        let frameCount = 0;

        return new Promise((resolve, reject) => {
            const captureFrame = () => {
                try {
                    const elapsed = Date.now() - session.startTime;
                    
                    // Verificar condiciones de parada
                    if (frameCount >= CONFIG.recording.targetFrames || elapsed >= CONFIG.recording.duration) {
                        resolve();
                        return;
                    }

                    // Capturar frame
                    const imageData = CameraController.captureFrame();
                    frameCount++;

                    session.frames.push({
                        data: imageData,
                        timestamp: elapsed,
                        frameNumber: frameCount
                    });

                    // Actualizar progreso
                    const progress = (frameCount / CONFIG.recording.targetFrames) * 100;
                    UIController.updateProgress(progress);

                    // Programar siguiente frame
                    setTimeout(captureFrame, frameInterval);
                    
                } catch (error) {
                    reject(error);
                }
            };

            captureFrame();
        });
    },

    /**
     * Finaliza una sesión de grabación
     * @param {Object} session - Sesión completada
     */
    finishSession(session) {
        AppState.recording.isActive = false;
        AppState.recording.counter++;
        AppState.recording.data.push({
            ...session,
            timestamp: new Date().toISOString()
        });

        // Actualizar UI
        UIController.updateRecordingCounter();
        UIController.setButtonStates({
            recordBtn: false,
            downloadBtn: false
        });
        
        UIController.updateProgress(0);
        UIController.updateStatus(
            `✅ Grabación ${AppState.recording.counter} completada. ${session.frames.length} frames capturados`, 
            'idle'
        );

        Utils.log(`Grabación completada: ${session.frames.length} frames`);
    }
};

// =================================================================
// GESTIÓN DE EXPORTACIÓN
// =================================================================

/**
 * Controlador de exportación
 */
const ExportController = {
    /**
     * Genera y descarga el archivo ZIP
     */
    async generateZip() {
        if (AppState.recording.data.length === 0) {
            Utils.showError('No hay grabaciones para descargar');
            return;
        }

        if (AppState.app.isProcessing) {
            Utils.log('Ya se está procesando un ZIP');
            return;
        }

        AppState.app.isProcessing = true;
        UIController.updateStatus('📦 Generando archivo ZIP...', 'idle');

        try {
            Utils.log('Iniciando generación de ZIP');
            
            // Verificar que JSZip esté disponible
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip no está cargado. Verifica la conexión a internet.');
            }
            
            // Verificar que saveAs esté disponible
            if (typeof saveAs === 'undefined') {
                throw new Error('FileSaver no está cargado. Verifica la conexión a internet.');
            }
            
            const zip = new JSZip();
            const signFolder = zip.folder(AppState.app.currentSignName);

            if (!signFolder) {
                throw new Error('No se pudo crear la carpeta principal del ZIP');
            }

            // Procesar cada grabación
            let totalFrames = 0;
            for (let i = 0; i < AppState.recording.data.length; i++) {
                const recording = AppState.recording.data[i];
                UIController.updateStatus(`📁 Procesando grabación ${i + 1} de ${AppState.recording.data.length}...`, 'idle');
                
                await this.addRecordingToZip(signFolder, recording);
                totalFrames += recording.frames.length;
                
                // Pequeña pausa para no bloquear la UI
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Generar ZIP
            UIController.updateStatus('📁 Comprimiendo archivos...', 'idle');
            Utils.log(`Generando ZIP con ${totalFrames} frames en total`);
            
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6
                }
            });

            if (!zipBlob || zipBlob.size === 0) {
                throw new Error('El archivo ZIP generado está vacío');
            }

            // Descargar archivo
            const fileName = Utils.generateFileName(AppState.app.currentSignName);
            Utils.log(`Descargando ZIP: ${fileName} (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`);
            
            saveAs(zipBlob, fileName);

            UIController.updateStatus(`✅ ZIP descargado: ${fileName}`, 'idle');
            Utils.log(`ZIP generado exitosamente: ${fileName}`);

        } catch (error) {
            Utils.log('Error al generar ZIP', error);
            UIController.updateStatus('❌ Error al generar ZIP', 'error');
            
            // Mostrar error más específico
            let errorMessage = 'Error al generar el archivo ZIP';
            if (error.message.includes('JSZip')) {
                errorMessage = 'Error: JSZip no está disponible. Recarga la página.';
            } else if (error.message.includes('FileSaver')) {
                errorMessage = 'Error: FileSaver no está disponible. Recarga la página.';
            } else if (error.message.includes('base64')) {
                errorMessage = 'Error: Datos de imagen corruptos. Intenta grabar nuevamente.';
            } else if (error.name === 'QuotaExceededError') {
                errorMessage = 'Error: No hay suficiente espacio en memoria. Reduce el número de grabaciones.';
            }
            
            Utils.showError(errorMessage);
        } finally {
            AppState.app.isProcessing = false;
        }
    },

    /**
     * Añade una grabación al ZIP
     * @param {Object} signFolder - Carpeta del ZIP
     * @param {Object} recording - Datos de grabación
     */
    async addRecordingToZip(signFolder, recording) {
        try {
            // Validar datos de grabación
            if (!recording || !recording.frames || !Array.isArray(recording.frames)) {
                throw new Error(`Datos de grabación inválidos para grabación ${recording?.recordingNumber || 'desconocida'}`);
            }

            if (recording.frames.length === 0) {
                Utils.log(`Advertencia: Grabación ${recording.recordingNumber} no tiene frames, se omite`);
                return;
            }

            const recordingFolderName = `${recording.signName}_${Utils.padNumber(recording.recordingNumber)}`;
            const recordingFolder = signFolder.folder(recordingFolderName);

            if (!recordingFolder) {
                throw new Error(`No se pudo crear la carpeta: ${recordingFolderName}`);
            }

            // Procesar cada frame
            for (let i = 0; i < recording.frames.length; i++) {
                const frame = recording.frames[i];
                
                // Validar frame
                if (!frame || !frame.data) {
                    Utils.log(`Advertencia: Frame ${i + 1} de grabación ${recording.recordingNumber} está vacío, se omite`);
                    continue;
                }

                // Validar formato de datos
                if (!frame.data.startsWith('data:image/')) {
                    throw new Error(`Frame ${i + 1} no tiene formato de imagen válido`);
                }

                const frameFileName = `frame_${Utils.padNumber(i + 1)}.jpg`;
                
                try {
                    // Convertir dataURL a base64
                    const base64Data = frame.data.split(',')[1];
                    
                    if (!base64Data || base64Data.length === 0) {
                        throw new Error(`Frame ${i + 1} no contiene datos base64 válidos`);
                    }

                    recordingFolder.file(frameFileName, base64Data, { base64: true });
                    
                } catch (frameError) {
                    Utils.log(`Error procesando frame ${i + 1}:`, frameError);
                    throw new Error(`Error en frame ${i + 1}: ${frameError.message}`);
                }
            }

            Utils.log(`Grabación añadida al ZIP: ${recordingFolderName} (${recording.frames.length} frames)`);
            
        } catch (error) {
            Utils.log(`Error añadiendo grabación al ZIP:`, error);
            throw error;
        }
    }
};

// =================================================================
// CONTROLADOR PRINCIPAL DE LA APLICACIÓN
// =================================================================

/**
 * Controlador principal de la aplicación
 */
const AppController = {
    /**
     * Inicializa la aplicación
     */
    async init() {
        try {
            Utils.log('Iniciando aplicación Script Frames');
            await UIController.init();
            Utils.log('Aplicación inicializada correctamente');
        } catch (error) {
            Utils.log('Error al inicializar la aplicación', error);
            Utils.showError('Error al inicializar la aplicación');
        }
    },

    /**
     * Inicia el proceso de grabación (cambia a vista de grabación)
     */
    async startRecording() {
        try {
            const signNameInput = document.getElementById('signName');
            const validation = Utils.validateSignName(signNameInput.value);
            
            if (!validation.isValid) {
                Utils.showError(validation.error);
                signNameInput.focus();
                return;
            }

            AppState.app.currentSignName = validation.name;
            UIController.updateSignName(validation.name);
            UIController.switchView('recording');
            
            await CameraController.init();
            
        } catch (error) {
            Utils.log('Error al iniciar grabación', error);
            UIController.switchView('initial');
        }
    },

    /**
     * Graba frames de video
     */
    async recordFrames() {
        try {
            await RecordingController.startSession();
        } catch (error) {
            Utils.log('Error al grabar frames', error);
            Utils.showError('Error durante la grabación');
        }
    },

    /**
     * Descarga el archivo ZIP
     */
    async downloadZip() {
        try {
            // Debug: Mostrar información del estado antes de generar ZIP
            Utils.log('Estado antes de generar ZIP:', {
                recordingDataLength: AppState.recording.data.length,
                currentSignName: AppState.app.currentSignName,
                isProcessing: AppState.app.isProcessing,
                firstRecording: AppState.recording.data[0] || null
            });

            await ExportController.generateZip();
        } catch (error) {
            Utils.log('Error al descargar ZIP', error);
            Utils.showError('Error al descargar el archivo ZIP: ' + error.message);
        }
    },

    /**
     * Vuelve a la vista inicial
     */
    goBack() {
        try {
            // Limpiar recursos
            CameraController.cleanup();
            
            // Resetear estado
            AppState.recording.data = [];
            AppState.recording.counter = 0;
            AppState.app.currentSignName = '';
            AppState.app.isProcessing = false;
            
            // Actualizar UI
            UIController.switchView('initial');
            UIController.resetInitialForm();
            UIController.updateRecordingCounter();
            
            Utils.log('Regresado a vista inicial');
            
        } catch (error) {
            Utils.log('Error al regresar a vista inicial', error);
        }
    }
};

// =================================================================
// INICIALIZACIÓN
// =================================================================

/**
 * Inicializar la aplicación cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', async () => {
    await AppController.init();
});

// =================================================================
// EXPORTACIÓN PARA USO GLOBAL
// =================================================================

// Exponer funciones principales para uso en HTML
window.ScriptFrames = {
    startRecording: () => AppController.startRecording(),
    recordFrames: () => AppController.recordFrames(),
    downloadZip: () => AppController.downloadZip(),
    goBack: () => AppController.goBack(),
    
    // Funciones de debug (usar en consola del navegador)
    debug: {
        getState: () => AppState,
        getConfig: () => CONFIG,
        validateLibraries: () => Utils.validateLibraries(),
        clearRecordings: () => {
            AppState.recording.data = [];
            AppState.recording.counter = 0;
            UIController.updateRecordingCounter();
            console.log('Grabaciones eliminadas');
        },
        testZip: async () => {
            try {
                const zip = new JSZip();
                zip.file('test.txt', 'Hello World');
                const blob = await zip.generateAsync({ type: 'blob' });
                saveAs(blob, 'test.zip');
                console.log('Test ZIP exitoso');
            } catch (error) {
                console.error('Test ZIP falló:', error);
            }
        }
    }
};
