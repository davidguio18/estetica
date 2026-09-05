import { AppController } from '../src/app.controller';

describe('AppController', () => {
  it('reports the API health status', () => {
    const controller = new AppController();

    expect(controller.health()).toEqual({
      status: 'ok',
      service: 'estetica-api',
    });
  });
});
