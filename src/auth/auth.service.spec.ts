
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from '../common/repositories/auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';

describe('AuthService', () => {
  let service: AuthService;

  const mockAuthRepository = {
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    findSessionById: jest.fn(),
    createSession: jest.fn(),
    createSessionReplacingOthers: jest.fn(),
    rotateSession: jest.fn(),
    revokeSession: jest.fn(),
    updatePasswordAndRevokeSessions: jest.fn(),
    deleteExpiredAndRevokedSessions: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: mockAuthRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
