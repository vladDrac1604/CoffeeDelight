const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    customerUserName:{
        type:String,
        required:true
    },
    customerName:{
        type:String,
        required:true
    },
    productName:{
        type:String,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    }
});

module.exports = mongoose.model('Cart',cartSchema);