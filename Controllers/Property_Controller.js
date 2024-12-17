const Property = require("../Models/Property_Model");
const Agent = require("../Models/Agent_Model");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/index");

class Product_controller {
	// Method to add a property
	async add_property(req, res) {
		try {

			// Destructure required fields from req.body
			const {
				property_agent,
				propertyname,
				ogprice,
				offprice,
				location,
				type,
				bdroom,
				bhroom,
				size,
			} = req.body;

			
			const decodedAgent = jwt.verify(property_agent, JWT_SECRET);
			const agentId = decodedAgent.id;

			const image = `${req.protocol}://${req.get("host")}/uploads/${
				req.file.filename
			}`;
			
			if (
				!agentId ||
				!propertyname ||
				!image ||
				!ogprice ||
				!location ||
				!type ||
				!bdroom ||
				!bhroom ||
				!size
			) {
				return res
					.status(400)
					.json({ Error: "Kindly fill all required fields." });
			}

			// Create a new property in the database
			const new_property = await Property.create({
				property_agent: agentId, // Use the verified agent ID
				propertyname,
				ogprice,
				offprice,
				location,
				type,
				bdroom,
				bhroom,
				size,
				image,
			});
			await Agent.findByIdAndUpdate(agentId, {
				$inc: { propertiesCount: 1 },
			});
			return res.status(201).json({ new_property });
		} catch (err) {
			console.error("Error adding property:", err.message); // Log the error for debugging
			return res.status(500).json({ Error: err.message });
		}
	}

	// Method to get all properties
	async get_property(req, res) {
		const query = Object.fromEntries(
			Object.entries(req.query).filter(([key, value]) => value !== "")
		);

		try {
			if (query.location) {
				query.location = { $regex: `^${query.location}`, $options: "i" };
			}
			if (query.price) {
				query.ogprice = { $lte: Number(query.price) };
			}
			if (query.keyword) {
				query.property_name = { $regex: query.keyword, $options: "i" }; // Matches anywhere in the property name, case-insensitive
			}
			const filteredProperties = await Property.find(query)
				.populate("property_agent", "name picture")
				.exec();
			return res.status(200).json(filteredProperties);
		} catch (err) {
			console.error("Error retrieving properties:", err.message);
			return res.status(500).json({ Error: err.message });
		}
	}
}

module.exports = Product_controller;
