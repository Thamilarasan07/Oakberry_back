const mongoose = require("mongoose");

const property_schema = new mongoose.Schema({
	property_agent: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "Agent",
	},
	date: { type: Date, default: Date.now },
	propertyname: { type: String, required: true },
	ogprice: { type: Number, required: true },
	offprice: { type: Number },
	location: { type: String, required: true },
	type: { type: String, required: true },
	bdroom: { type: Number, required: true },
	bhroom: { type: Number, required: true },
	size: { type: Number, required: true },
	image: { type: String, required: true },
});

const Property = mongoose.model("Property", property_schema);
module.exports = Property;
