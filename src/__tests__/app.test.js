jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(true),
  };
});

jest.mock('../models/Product', () => {
  return {
    find: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([{ _id: 'prod1', name: 'Test Laptop', price: 999, category: 'Electronics' }]),
    countDocuments: jest.fn().mockResolvedValue(1),
    findById: jest.fn().mockResolvedValue({ _id: 'prod1', name: 'Test Laptop', isActive: true }),
  };
});

console.log = jest.fn();

const request = require('supertest');
const app = require('../index');

describe('Product Service APIs', () => {
  it('GET /health - should return 200 and health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('product-service');
  });

  it('GET /products - should return paginated list of products', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(200);
    expect(res.body.products).toBeDefined();
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].name).toBe('Test Laptop');
  });

  it('GET /products/:id - should return a single product summary', async () => {
    const res = await request(app).get('/products/prod1');
    expect(res.statusCode).toBe(200);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.name).toBe('Test Laptop');
  });

  it('POST /products - should return 401 if unauthorized (no token)', async () => {
    const res = await request(app).post('/products').send({
      name: 'New Item',
      description: 'Desc',
      price: 10,
      category: 'Other'
    });
    expect(res.statusCode).toBe(401);
  });
});
