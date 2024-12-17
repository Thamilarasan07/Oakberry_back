// multerConfig.js
const multer = require("multer");
const path = require("path");

// Configure Multer Storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "Uploads/"); // Specify the upload directory
	},
	filename: (req, file, cb) => {
		// Use the property name and date in the filename if available
		const propertyname = req.body.propertyname || "unknown";
		const date = new Date().toISOString().split("T")[0]; 
		cb(
			null,
			`${propertyname}-${date}-${Date.now()}${path.extname(file.originalname)}`
		);
	},
});

// Initialize Multer with the storage configuration
const upload = multer({ storage: storage });

module.exports = upload;
