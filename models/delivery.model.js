const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    deliveryNumber: {
      type: String,
      required: true,
      unique: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const Delivery = mongoose.model("Delivery", deliverySchema);

module.exports = Delivery;
