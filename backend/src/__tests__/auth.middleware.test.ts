import { authMiddleware, requireRole, AuthRequest } from '../middlewares/auth.middleware';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('authMiddleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    (nextFunction as jest.Mock).mockClear();
  });

  it('should return 401 if Authorization header is missing', () => {
    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Acesso negado. Token não fornecido.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    mockRequest.headers = { authorization: 'Bearer invalidtoken' };
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token inválido ou expirado.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next and populate user if token is valid', () => {
    const mockUserPayload = { id: 'user-1', name: 'Carlos', role: 'OPERATOR' };
    mockRequest.headers = { authorization: 'Bearer validtoken' };
    (jwt.verify as jest.Mock).mockReturnValue(mockUserPayload);

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', expect.any(String));
    expect(mockRequest.user).toEqual(mockUserPayload);
    expect(nextFunction).toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    (nextFunction as jest.Mock).mockClear();
  });

  it('should return 403 if user is not in request', () => {
    const middleware = requireRole('OPERATOR');
    middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Acesso negado. Permissão insuficiente.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 if user role does not match', () => {
    mockRequest.user = { id: 'user-1', name: 'User', role: 'USER' };
    const middleware = requireRole('OPERATOR');
    middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Acesso negado. Permissão insuficiente.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next if role matches', () => {
    mockRequest.user = { id: 'user-1', name: 'Operator', role: 'OPERATOR' };
    const middleware = requireRole('OPERATOR');
    middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });
});
