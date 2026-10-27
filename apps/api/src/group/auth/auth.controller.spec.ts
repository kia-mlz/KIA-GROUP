import { AuthController } from './auth.controller';

describe('AuthController refresh cookie', () => {
  it('sets refreshToken cookie with path=/ for client refresh flows', async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({
        user: { id: 'u1', name: 'Alex', email: 'a@b.c', role: 'LEARNER' },
        accessToken: 'access',
        expiresIn: 900,
        refreshToken: 'refresh-token',
      }),
      attachRefreshCookie: jest.fn(),
      omitRefreshToken: jest.fn((result: { refreshToken: string }) => {
        const { refreshToken: _r, ...rest } = result;
        return rest;
      }),
    };

    const controller = new AuthController(authService as never);

    const cookie = jest.fn();
    const res = { cookie } as never;

    await controller.login({ email: 'a@b.c', password: 'secret' }, res);

    expect(authService.attachRefreshCookie).toHaveBeenCalledWith(res, 'refresh-token');
    expect(authService.omitRefreshToken).toHaveBeenCalled();
  });
});
