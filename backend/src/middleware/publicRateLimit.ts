import rateLimit from 'express-rate-limit';

export const publicDegustacaoRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas solicitações em pouco tempo. Aguarde um minuto e tente novamente.' },
});
