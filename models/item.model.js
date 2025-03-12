const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itemSchema = new Schema({
    itemType: { type: String },
    itemDesc: { type: String },
    sizeSource: { type:String },
    serialNo: { type: String },
})

module.exports = mongoose.model("Item", itemSchema);