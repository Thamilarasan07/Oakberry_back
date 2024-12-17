const express = require("express");
const Property_controller = require("../Controllers/Property_Controller");
const upload = require("../Middleware/multerconfig"); // Import the Multer configuration
const authenticateToken = require("../Middleware/Authenticatetoken");
const PropertyController = new Property_controller();
const router = express.Router();

// Route to add a property with file upload
router.post(
	"/property/add_property",
	upload.single("image"),
	authenticateToken,
	PropertyController.add_property
);

// Route to get all properties
router.get(
	"/property/get_all_property",
	authenticateToken,
	PropertyController.get_property
);

module.exports = router;
