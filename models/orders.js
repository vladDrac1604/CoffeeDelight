const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    username:{
        type:String
    },
    products:[
        {
            type:String
        }
    ],
    quantity:[
        {
            type:Number
        }
    ]
});

module.exports = mongoose.model('Order',orderSchema);