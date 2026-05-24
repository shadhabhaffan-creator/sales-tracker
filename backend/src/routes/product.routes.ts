import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, getProductHistory } from '../controllers/products/product.controller';
import { protect, admin } from '../middleware/auth.middleware';

import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

const productSchema = {
  name: { required: true, type: 'string' },
  costPrice: { required: true, type: 'number' },
  sellingPrice: { required: true, type: 'number' },
  stock: { required: true, type: 'number' },
};

router.get('/', protect, getProducts);
router.get('/:id/history', protect, getProductHistory);
router.post('/', protect, admin, validateRequest(productSchema), createProduct);
router.put('/', protect, admin, validateRequest(productSchema), updateProduct);
router.delete('/', protect, admin, deleteProduct);

export default router;
