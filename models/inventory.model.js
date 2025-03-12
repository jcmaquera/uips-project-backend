const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item", // Reference to the Item model
      required: true,
    },
    quantity: {
      type: Number,
      default: 0, // Default to 0 if no quantity is specified
    },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;
