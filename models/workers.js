const mongoose = require('mongoose');
const Schema = mongoose.Schema;
 
const WorkerSchema = new Schema({
    name:{
        type:String,
        required:true       
    },
    job:{
        type:String,
        required:true
    },
    contact:{
        type:String,
        required:true
    }
})

module.exports = mongoose.model('Worker',WorkerSchema);