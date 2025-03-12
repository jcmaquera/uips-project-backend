const mongoose = require("mongoose");

const checkoutSchema = new mongoose.Schema(
  {
    checkoutNumber: {
      type: String,
      required: true,
      unique: true, // Ensure the checkout number is unique
    },
    checkoutDate: {
      type: Date,
      required: true, // Checkout date is required
    },
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item", // Reference to the Item model
          required: true, // Each item in the checkout must reference an existing item
        },
        quantity: {
          type: Number,
          required: true, // Quantity of the item being checked out
        },
      },
    ],
  },
  { timestamps: true } // To automatically handle createdAt and updatedAt timestamps
);

const Checkout = mongoose.model("Checkout", checkoutSchema);

module.exports = Checkout;
