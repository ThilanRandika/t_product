const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products (with optional filters)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search in name/description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product (authenticated)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, category]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               stock:
 *                 type: integer
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').notEmpty().withMessage('Category is required'),
    body('stock').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const product = await Product.create({ ...req.body, createdBy: req.user.userId });
      res.status(201).json({ message: 'Product created', product });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product (authenticated – owner or admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Only owner or admin can update
    if (product.createdBy !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: not your product' });
    }

    const allowed = ['name', 'description', 'price', 'category', 'stock', 'imageUrl', 'isActive'];
    allowed.forEach((field) => { if (req.body[field] !== undefined) product[field] = req.body[field]; });
    await product.save();

    res.json({ message: 'Product updated', product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Soft-delete a product (authenticated – owner or admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.createdBy !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: not your product' });
    }

    product.isActive = false;
    await product.save();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
