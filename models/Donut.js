const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DonutSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    image:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref:'Review'
        }
    ],
    likes : [
        { type: String }
    ]
})

module.exports = mongoose.model('Donut',DonutSchema);