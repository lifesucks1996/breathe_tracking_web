/**
 * @file test/test_users_edit.test.js
 * @brief Test automático de validación de usuarios usando Jest.
 */

// --- 1. MOCK DEL DOM ---
// Simulamos el navegador porque Jest corre en Node
global.document = {
    getElementById: () => null,
    querySelector: () => ({ 
        classList: { add: () => {}, remove: () => {} },
        textContent: '' 
    }),
    querySelectorAll: () => [],
    activeElement: null
};

global.window = {};

// --- 2. IMPORTACIÓN ---
// Importamos tu función corregida
const { validate } = require('../src/js/users_edit.js');

// --- 3. TESTS (JEST) ---
describe('Validación de Edición de Usuarios', () => {

    test('Debe aceptar datos válidos (Nombre, Apellidos y CP correctos)', () => {
        const datosCorrectos = {
            nombre: "Ana",
            apellidos: "López",
            cp: "46001",
        };
        // Esperamos que sea TRUE
        expect(validate(datosCorrectos)).toBe(true);
    });

    test('Debe rechazar nombres demasiado cortos', () => {
        const datosMalNombre = {
            nombre: "A", 
            apellidos: "López",
            cp: "46001"
        };
        // Esperamos que sea FALSE
        expect(validate(datosMalNombre)).toBe(false);
    });

    test('Debe rechazar Códigos Postales incompletos', () => {
        const datosMalCP = {
            nombre: "Ana",
            apellidos: "López",
            cp: "460" 
        };
        // Esperamos que sea FALSE
        expect(validate(datosMalCP)).toBe(false);
    });

});