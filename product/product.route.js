import express from "express";
import {
  isBuyer,
  isSeller,
  isUser,
} from "../middleware/authentication.middleware.js";
import { checkProductOwnerShip } from "../middleware/check.product.ownership.js";
import { validateReqBody } from "../middleware/validation.middleware.js";
import { checkMongoIdValidity } from "../utils/check.mongo.id.validity.js";
import Product from "./product.model.js";
import { paginationSchema, productSchema } from "./product.validation.js";

const router = express.Router();

// add product
router.post(
  "/product/add",
  isSeller,
  validateReqBody(productSchema),
  async (req, res) => {
    //    extract new product from req.body
    const newProduct = req.body;

    // we need logged in user id for product owner id
    newProduct.ownerId = req.loggedInUser._id;

    // create product
    await Product.create(newProduct);

    return res.status(200).send({ message: "Product is added successfully." });
  }
);

// get product details
router.get(
  "/product/details/:id",
  isUser,
  checkMongoIdValidity,
  async (req, res) => {
    // extract id from req.params
    const productId = req.params.id;

    // find product
    const requiredProduct = await Product.findOne({ _id: productId });

    // if not product, throw error

    if (!requiredProduct) {
      return res.status(404).send({ message: "Product does not exist." });
    }

    //   hide ownerId
    requiredProduct.ownerId = undefined;

    // send product details as response
    return res
      .status(200)
      .send({ message: "success", product: requiredProduct });
  }
);

// delete product
router.delete(
  "/product/delete/:id",
  isSeller,
  checkMongoIdValidity,
  checkProductOwnerShip,
  async (req, res) => {
    // extract id from req.params
    const productId = req.params.id;

    // delete product
    await Product.deleteOne({ _id: productId });

    return res
      .status(200)
      .send({ message: "Product is deleted successfully." });
  }
);

// edit product
router.put(
  "/product/edit/:id",
  isSeller,
  checkMongoIdValidity,
  validateReqBody(productSchema),
  checkProductOwnerShip,
  async (req, res) => {
    // extract id from req.params
    const productId = req.params.id;

    // extract new values from req.body
    const newValues = req.body;

    // update product
    await Product.updateOne({ _id: productId }, { $set: { ...newValues } });

    // send response
    return res
      .status(200)
      .send({ message: "Product is updated successfully." });
  }
);

// get product list by buyer
router.post(
  "/product/buyer/list",
  isBuyer,
  validateReqBody(paginationSchema),
  async (req, res) => {
    // extract pagination data from req.body
    const { page, limit, searchText } = req.body;

    // calculate skip
    const skip = (page - 1) * limit;

    // filter stage
    let match = {};

    if (searchText) {
      match = { name: { $regex: searchText, $options: "i" } };
    }

    // query
    const products = await Product.aggregate([
      {
        $match: match,
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          name: 1,
          price: 1,
          brand: 1,
          image: 1,
        },
      },
    ]);

    // send res

    return res.status(200).send({ message: "success", products: products });
  }
);

// get product list by seller
router.post(
  "/product/seller/list",
  isSeller,
  validateReqBody(paginationSchema),
  async (req, res) => {
    // extract pagination data from req.body
    const { page, limit, searchText } = req.body;

    // calculate skip
    const skip = (page - 1) * limit;

    // filter stage
    let match = { ownerId: req.loggedInUserId };

    if (searchText) {
      match = {
        ownerId: req.loggedInUserId,
        name: { $regex: searchText, $options: "i" },
      };
    }

    let products = await Product.aggregate([
      {
        $match: match,
      },
      {
        $skip: skip,
      },
      { $limit: limit },
      {
        $project: {
          name: 1,
          brand: 1,
          price: 1,
          image: 1,
        },
      },
    ]);

    return res.status(200).send({ message: "success", products: products });
  }
);
export default router;
