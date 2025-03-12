require("dotenv").config();

const config = require("./config.json");
const mongoose = require("mongoose");

mongoose.connect(config.connectionString);

const User = require("./models/user.model");
const Item = require("./models/item.model");
const Delivery = require("./models/delivery.model"); // Import the Delivery model
const Inventory = require("./models/inventory.model"); // Import Inventory model
const Checkout = require("./models/checkout.model"); // Import the Checkout model

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");

app.use(express.json());

//Cors
app.use(
  cors({
    origin: "*",
  })
);

//Create Account
app.post("/create-account", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName) {
    return res
      .status(400)
      .json({ error: true, message: "Full Name is required" });
  }

  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required" });
  }

  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "Password is required" });
  }

  const isUser = await User.findOne({ email: email });

  if (isUser) {
    return res.json({
      error: true,
      message: "User already exist",
    });
  }

  const user = new User({
    fullName,
    email,
    password,
  });

  await user.save();

  const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "36000m",
  });

  return res.json({
    error: false,
    user,
    accessToken,
    message: "Registration Successful",
  });
});

//Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const userInfo = await User.findOne({ email: email });

  if (!userInfo) {
    return res.status(400).json({ message: "User not found" });
  }

  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "36000m",
    });

    return res.json({
      error: false,
      message: "Login successful",
      email,
      accessToken,
    });
  } else {
    return res.status(400).json({
      error: true,
      message: "Invalid Credentials",
    });
  }
});

//Get User
app.get("/get-user", authenticateToken, async (req, res) => {
  const { user } = req.user;

  const isUser = await User.findOne({ _id: user._id });

  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({
    user: {
      fullName: isUser.fullName,
      email: isUser.email,
      _id: isUser._id,
      createdOn: isUser.createdOn,
    },
    message: "",
  });
});

//Add Item
app.post("/add-item", async (req, res) => {
  const { itemType, itemDesc, sizeSource, serialNo } = req.body;

  if (!itemType) {
    return res
      .status(400)
      .json({ error: true, message: "Item Type is required" });
  }

  if (!itemDesc) {
    return res
      .status(400)
      .json({ error: true, message: "Item Description is required" });
  }

  if (!sizeSource) {
    return res
      .status(400)
      .json({ error: true, message: "Size/Source is required" });
  }

  if (!serialNo) {
    return res
      .status(400)
      .json({ error: true, message: "Serial Number is required" });
  }

  const isItem = await Item.findOne({ serialNo: serialNo });

  if (isItem) {
    return res.json({
      error: true,
      message: "Item already exists",
    });
  }

  const item = new Item({
    itemType,
    itemDesc,
    sizeSource,
    serialNo,
  });

  // Create the item and save it to the database
  await item.save();

  // Also create an inventory entry with quantity set to 0 initially
  const inventoryItem = new Inventory({
    item: item._id, // Reference to the item
    quantity: 0, // Initialize with 0 quantity
  });

  await inventoryItem.save();

  return res.json({ error: false, message: "Item added successfully", item });
});

//Get Items
app.get("/get-items", async (req, res) => {
  try {
    const items = await Item.find({});
    return res.json({
      error: false,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Failed to retrieve items",
    });
  }
});

// Get Item by Serial Number (for barcode scanning) using POST
app.post("/get-item-by-serial", async (req, res) => {
  const { serialNo } = req.body;

  if (!serialNo) {
    return res
      .status(400)
      .json({ error: true, message: "Serial Number is required" });
  }

  try {
    const item = await Item.findOne({ serialNo: serialNo });

    if (!item) {
      return res.status(404).json({ error: true, message: "Item not found" });
    }

    return res.json({
      error: false,
      item,
    });
  } catch (error) {
    console.error("Error fetching item:", error);
    return res.status(500).json({
      error: true,
      message: "Failed to retrieve item",
    });
  }
});

// Add Delivery
app.post("/add-delivery", authenticateToken, async (req, res) => {
  const { deliveryNumber, deliveryDate, items } = req.body;

  // Validation checks
  if (!deliveryNumber) {
    return res
      .status(400)
      .json({ error: true, message: "Delivery number is required" });
  }

  if (!deliveryDate) {
    return res
      .status(400)
      .json({ error: true, message: "Delivery date is required" });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: true, message: "Items are required" });
  }

  try {
    // Create a new delivery record
    const newDelivery = new Delivery({
      deliveryNumber,
      deliveryDate,
      items,
    });

    // Save the delivery to the database
    await newDelivery.save();

    // Now update the inventory for each item in the delivery
    for (let itemData of items) {
      const { item, quantity } = itemData;

      // Check if the item already exists in the inventory
      let inventoryItem = await Inventory.findOne({ item });

      if (inventoryItem) {
        // If the item exists, update its quantity
        inventoryItem.quantity += quantity;
        await inventoryItem.save();
      } else {
        // If the item does not exist, create a new inventory record
        const newInventoryItem = new Inventory({
          item,
          quantity,
        });
        await newInventoryItem.save();
      }
    }

    return res.json({
      error: false,
      message: "Delivery added successfully",
      delivery: newDelivery,
    });
  } catch (error) {
    console.error("Error adding delivery:", error);
    return res.status(500).json({
      error: true,
      message: "Failed to add delivery",
    });
  }
});

// Create a new checkout and update inventory
app.post("/checkout", authenticateToken, async (req, res) => {
  const { checkoutNumber, checkoutDate, items } = req.body;

  // Validation checks
  if (!checkoutNumber) {
    return res.status(400).json({ error: true, message: "Checkout number is required" });
  }

  if (!checkoutDate) {
    return res.status(400).json({ error: true, message: "Checkout date is required" });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: true, message: "Items are required" });
  }

  try {
    // Create a new checkout record
    const newCheckout = new Checkout({
      checkoutNumber,
      checkoutDate,
      items,
    });

    // Save the checkout to the database
    await newCheckout.save();

    // Update the inventory after checkout
    for (let itemData of items) {
      const { item, quantity } = itemData;

      // Find the inventory item to update
      let inventoryItem = await Inventory.findOne({ item });

      if (inventoryItem) {
        // Check if the quantity to be deducted is available in the inventory
        if (inventoryItem.quantity >= quantity) {
          // Subtract the quantity from the inventory
          inventoryItem.quantity -= quantity;

          // Save the updated inventory item
          await inventoryItem.save();
        } else {
          // If there is not enough stock, return an error
          return res.status(400).json({
            error: true,
            message: `Not enough stock for item: ${item}`,
          });
        }
      } else {
        // If the item does not exist in the inventory, return an error
        return res.status(400).json({
          error: true,
          message: `Item not found in inventory: ${item}`,
        });
      }
    }

    return res.json({
      error: false,
      message: "Checkout and inventory update successful",
      checkout: newCheckout,
    });
  } catch (error) {
    console.error("Error adding checkout:", error);
    return res.status(500).json({
      error: true,
      message: "Failed to add checkout and update inventory",
    });
  }
});

//Get Inventory
app.get("/get-inventory", async (req, res) => {
  try {
    const inventoryData = await Inventory.find()
      .populate("item", "itemType itemDesc sizeSource serialNo") // Populate item details
      .exec();

    res.json(inventoryData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching inventory data" });
  }
});


app.listen(8000);

module.exports = app;
