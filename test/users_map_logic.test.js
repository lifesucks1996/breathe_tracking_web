/**
 * @file test/users_map_logic.test.js
 * @brief Tests unitarios para users_map_data.js
 */


// Como Jest corre en Node, no tiene 'window'. Lo creamos falsamente aquí.
global.window = {
    // Definimos funciones vacías por si el código las llama
    inicializarFirebase: () => {},
    obtenerDatosDelSensor: () => {},
    calcularContaminacionEnUbicacion: () => {}
};

// También simulamos la variable de config de firebase para que no falle esa línea
global.__firebase_config = JSON.stringify({}); 

// --- IMPORTAR TU CÓDIGO ---
const mapLogic = require('../src/js/users_map_data.js');

describe('Pruebas de Lógica de Mapa (users_map_data.js)', () => {

    // --- TEST 1: COMPROBAR LA ASIGNACIÓN DE COLORES ---
    test('Debe asignar intensidad 0.5 (Amarillo) si el valor está en el rango medio', () => {
        // PREPARACIÓN
        const valorMedido = 60;
        
        const nivelesConfig = [
            { min: 0, max: 50, color: 'Verde' },
            { min: 51, max: 100, color: 'Amarillo' }, 
            { min: 101, max: 200, color: 'Rojo' }
        ];

        // EJECUCIÓN
        const intensidad = mapLogic.obtenerIntensidadSegunNivel(valorMedido, nivelesConfig);

        // VERIFICACIÓN
        expect(intensidad).toBe(0.5);
    });

    test('Debe asignar intensidad 0.2 (Verde) por defecto si no encaja en ningún nivel', () => {
        const valorFueraDeRango = 5000; 
        const nivelesConfig = [{ min: 0, max: 100, color: 'Verde' }];

        const intensidad = mapLogic.obtenerIntensidadSegunNivel(valorFueraDeRango, nivelesConfig);
        
        expect(intensidad).toBe(0.2);
    });

    // --- TEST 2: COMPROBAR LA MATEMÁTICA DE INTERPOLACIÓN (IDW) ---
    test('La interpolación debe promediar valores cercanos', () => {
        // PREPARACIÓN
        const datosFalsos = [
            [40.0001, -3.0001, 100], 
            [40.0001, -3.0001, 100], 
        ];
        
        mapLogic.setCachePruebas(datosFalsos);

        // EJECUCIÓN
        const resultado = mapLogic.calcularContaminacionEnUbicacion(40.0001, -3.0001);

        // VERIFICACIÓN
        expect(resultado).toBeCloseTo(100, 1);
    });

    test('La interpolación debe devolver 0 si no hay sensores cerca', () => {
        mapLogic.setCachePruebas([[40.0, -3.0, 100]]); 
        
        const resultado = mapLogic.calcularContaminacionEnUbicacion(41.38, 2.17);

        expect(resultado).toBe(0);
    });
});