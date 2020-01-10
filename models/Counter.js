const mongoose = require('mongoose');

let counterSchema = mongoose.Schema({
    name: { type: String, required: true, },
    totalCount: { type: Number, required: true, },
});

let Counter = mongoose.model('counter', counterSchema);
module.exports = Counter;