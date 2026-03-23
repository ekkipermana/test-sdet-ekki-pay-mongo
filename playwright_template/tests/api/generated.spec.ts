import { test, expect } from '@playwright/test';

test.describe('Health API', () => {
  const BASE_URL = 'http://localhost:8080';

  test('should return health status 200 OK', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      message: 'Server is running',
      status: 'healthy',
    });
  });
});