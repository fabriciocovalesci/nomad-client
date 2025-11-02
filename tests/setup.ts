/**
 * Jest setup file - executado antes de todos os testes
 */

// Configurar timezone para testes consistentes
process.env.TZ = 'UTC';

// Configurar variáveis de ambiente para testes
process.env.NOMAD_ADDR = 'http://localhost:4646';
process.env.NOMAD_NAMESPACE = 'test';

// Timeout global para testes assíncronos
jest.setTimeout(10000);

// Mock console durante testes (opcional)
global.console = {
  ...console,
  // Desabilitar logs durante testes para output mais limpo
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn, // Manter warnings
  error: console.error, // Manter errors
};

// Configuração global para mocks
beforeEach(() => {
  jest.clearAllMocks();
});