import request from 'supertest';
import { createApp } from './app';

describe('API health endpoint', () => {
  it('GET /api/health should return status ok', async () => {
    const app = createApp();

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        timestamp: expect.any(String),
      })
    );
  });
});
