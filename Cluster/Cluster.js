const cluster = require("cluster");
const http = require("http");
const os = require("os");

if (cluster.isMaster) {
	const CPU = os.cpus().length;

	for (let i = 0; i < CPU; i++) {
		cluster.fork();
	}
	cluster.on("exit", (Worker, code, signal) => {
		console.log(`Worker ${worker.process.pid} died. Spawning a new worker...`);
		cluster.fork();
	});
} else {
	http
		.createServer((req, res) => {
			res.writeHead(200);
			res.end(`Response from worker ${process.pid}\n`);
		})
		.listen(3001);

	console.log(`Worker process ${process.pid} started`);
}
